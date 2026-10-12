const { convertToCoreMessages } = require('ai');

const messages = [{
  role: 'user',
  content: 'Hello',
  experimental_attachments: [{
    url: 'data:image/jpeg;base64,AABBCCDD',
    contentType: 'image/jpeg',
    name: 'test.jpg'
  }]
}];

const coreMsgs = convertToCoreMessages(messages);
console.log(JSON.stringify(coreMsgs, null, 2));
