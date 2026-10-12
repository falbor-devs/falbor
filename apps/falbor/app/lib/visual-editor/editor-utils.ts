import { EditorBtns } from "./constants"

export const getDragImage = (type: string, label: string) => {
  const dragIcon = document.createElement('div')
  dragIcon.style.width = '140px'
  dragIcon.style.height = '44px'
  dragIcon.style.backgroundColor = '#0099FF'
  dragIcon.style.borderRadius = '10px'
  dragIcon.style.display = 'flex'
  dragIcon.style.alignItems = 'center'
  dragIcon.style.justifyContent = 'center'
  dragIcon.style.color = 'white'
  dragIcon.style.fontWeight = '600'
  dragIcon.style.fontSize = '14px'
  dragIcon.style.boxShadow = '0 10px 15px -3px rgba(0, 153, 255, 0.4)'
  dragIcon.innerText = `Moving ${label || type}`
  dragIcon.style.position = 'absolute'
  dragIcon.style.top = '-1000px'
  dragIcon.style.zIndex = '9999'
  document.body.appendChild(dragIcon)
  return dragIcon
}

export const handleEditorDragStart = (e: React.DragEvent, type: EditorBtns, label?: string) => {
  if (type === null) return
  e.dataTransfer.setData('componentType', type)
  const dragIcon = getDragImage(type, label || '')
  e.dataTransfer.setDragImage(dragIcon, 70, 22)
  setTimeout(() => {
    if (document.body.contains(dragIcon)) {
      document.body.removeChild(dragIcon)
    }
  }, 0)
}
