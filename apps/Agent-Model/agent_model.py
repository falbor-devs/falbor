import argparse
import base64
import io
import json
import os
import re
from typing import Any

import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image
from pydantic import BaseModel
from transformers import AutoModelForMultimodalLM, AutoProcessor, BitsAndBytesConfig, Qwen2VLForConditionalGeneration

MODEL_ID = os.getenv('FALBOR_LOCAL_MODEL_ID', 'HuggingFaceTB/SmolVLM-500M-Instruct')
CPU_DTYPE = os.getenv('FALBOR_LOCAL_CPU_DTYPE', 'float32').lower()
app = FastAPI(title='Falbor Local Agent Model')
processor = None
model = None


class ChatRequest(BaseModel):
    model: str
    messages: list[dict[str, Any]]
    tools: list[dict[str, Any]] | None = None
    stream: bool | None = False
    max_tokens: int | None = 512
    temperature: float | None = 0.2


def load_model() -> None:
    global processor, model
    if model is not None:
        return
    processor = AutoProcessor.from_pretrained(MODEL_ID, min_pixels=256 * 28 * 28, max_pixels=768 * 28 * 28)
    load_options: dict[str, Any] = {'device_map': 'auto', 'low_cpu_mem_usage': True}
    if os.getenv('FALBOR_LOCAL_4BIT', '1') == '1' and torch.cuda.is_available():
        load_options['quantization_config'] = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16, bnb_4bit_quant_type='nf4', bnb_4bit_use_double_quant=True)
    else:
        if torch.cuda.is_available():
            load_options['torch_dtype'] = torch.float16
        elif CPU_DTYPE == 'bfloat16':
            load_options['torch_dtype'] = torch.bfloat16
        elif CPU_DTYPE == 'float16' and 'SmolVLM' not in MODEL_ID:
            load_options['torch_dtype'] = torch.float16
        else:
            load_options['torch_dtype'] = torch.float32
    model_class = AutoModelForMultimodalLM if 'SmolVLM' in MODEL_ID else Qwen2VLForConditionalGeneration
    model = model_class.from_pretrained(MODEL_ID, **load_options)


def decode_image(url: str) -> Image.Image:
    if url.startswith('data:'):
        _, encoded = url.split(',', 1)
        return Image.open(io.BytesIO(base64.b64decode(encoded))).convert('RGB')
    import requests
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    return Image.open(io.BytesIO(response.content)).convert('RGB')


def normalize_messages(messages: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[Image.Image]]:
    images = []
    normalized = []
    for message in messages:
        content = message.get('content')
        if not isinstance(content, list):
            if 'SmolVLM' in MODEL_ID:
                normalized.append({'role': message.get('role', 'user'), 'content': [{'type': 'text', 'text': str(content or '')}]})
            else:
                normalized.append(message)
            continue
        parts = []
        for item in content:
            if item.get('type') == 'text':
                parts.append({'type': 'text', 'text': item.get('text', '')})
            elif item.get('type') == 'image_url':
                image = decode_image(item['image_url']['url'])
                images.append(image)
                parts.append({'type': 'image', 'image': image})
        normalized.append({'role': message.get('role', 'user'), 'content': parts})
    return normalized, images


def parse_tool_call(text: str) -> tuple[str, dict[str, Any]] | None:
    match = re.search(r'<tool_call>\s*(\{.*?\})\s*</tool_call>', text, re.DOTALL)
    if not match:
        return None
    payload = json.loads(match.group(1))
    arguments = payload.get('arguments', {})
    if isinstance(arguments, str):
        arguments = json.loads(arguments)
    return payload['name'], arguments


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'model': MODEL_ID}


def completion_payload(text: str, tool_call: tuple[str, dict[str, Any]] | None, prompt_tokens: int, completion_tokens: int) -> dict[str, Any]:
    if tool_call:
        name, arguments = tool_call
        return {'id': 'falbor-local-completion', 'object': 'chat.completion', 'choices': [{'index': 0, 'message': {'role': 'assistant', 'content': None, 'tool_calls': [{'id': 'falbor-local-tool-call', 'type': 'function', 'function': {'name': name, 'arguments': json.dumps(arguments)}}]}, 'finish_reason': 'tool_calls'}], 'usage': {'prompt_tokens': prompt_tokens, 'completion_tokens': completion_tokens, 'total_tokens': prompt_tokens + completion_tokens}}
    return {'id': 'falbor-local-completion', 'object': 'chat.completion', 'choices': [{'index': 0, 'message': {'role': 'assistant', 'content': text}, 'finish_reason': 'stop'}], 'usage': {'prompt_tokens': prompt_tokens, 'completion_tokens': completion_tokens, 'total_tokens': prompt_tokens + completion_tokens}}


def stream_payload(payload: dict[str, Any]):
    choice = payload['choices'][0]
    message = choice['message']
    if message.get('tool_calls'):
        tool_call = message['tool_calls'][0]
        delta = {'role': 'assistant', 'tool_calls': [{'index': 0, **tool_call}]}
        chunk = {'id': payload['id'], 'object': 'chat.completion.chunk', 'choices': [{'index': 0, 'delta': delta, 'finish_reason': 'tool_calls'}]}
    else:
        chunk = {'id': payload['id'], 'object': 'chat.completion.chunk', 'choices': [{'index': 0, 'delta': {'role': 'assistant', 'content': message.get('content', '')}, 'finish_reason': 'stop'}]}
    yield f'data: {json.dumps(chunk)}\n\n'
    yield 'data: [DONE]\n\n'


@app.post('/v1/chat/completions')
def chat(request: ChatRequest):
    try:
        load_model()
        normalized, images = normalize_messages(request.messages)
        template_options: dict[str, Any] = {'tokenize': False, 'add_generation_prompt': True}
        if request.tools:
            template_options['tools'] = request.tools
        if 'SmolVLM' in MODEL_ID:
            template_options.update({'tokenize': True, 'return_dict': True, 'return_tensors': 'pt'})
            inputs = processor.apply_chat_template(normalized, **template_options)
        else:
            prompt = processor.apply_chat_template(normalized, **template_options)
            inputs = processor(text=[prompt], images=images or None, padding=True, return_tensors='pt')
        inputs = inputs.to(next(model.parameters()).device)
        generation_options: dict[str, Any] = {'max_new_tokens': min(max(request.max_tokens or 512, 1), 2048), 'do_sample': False}
        if request.temperature and request.temperature > 0:
            generation_options.update({'do_sample': True, 'temperature': request.temperature})
        generation_options.update({'repetition_penalty': 1.08, 'no_repeat_ngram_size': 3})
        output = model.generate(**inputs, **generation_options)
        generated = output[:, inputs.input_ids.shape[1]:]
        text = processor.batch_decode(generated, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
        tool_call = parse_tool_call(text)
        payload = completion_payload(text, tool_call, int(inputs.input_ids.shape[1]), int(generated.shape[1]))
        if request.stream:
            return StreamingResponse(stream_payload(payload), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'Connection': 'keep-alive'})
        return JSONResponse(payload)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


if __name__ == '__main__':
    import uvicorn
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
