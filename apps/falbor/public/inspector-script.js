(function () {
  let isInspectorActive = false;
  let inspectorStyle = null;
  let currentHighlight = null;

  function getRelevantStyles(element) {
    const computedStyles = window.getComputedStyle(element);
    const relevantProps = [
      'display', 'position', 'width', 'height', 'margin', 'padding',
      'border', 'border-radius', 'background', 'background-color', 'color',
      'font-size', 'font-family', 'font-weight', 'text-align',
      'flex-direction', 'justify-content', 'align-items', 'object-fit'
    ];

    const styles = {};
    relevantProps.forEach(prop => {
      const value = computedStyles.getPropertyValue(prop);
      if (value) styles[prop] = value;
    });

    return styles;
  }

  function createReadableSelector(element) {
    let selector = element.tagName.toLowerCase();

    if (element.id) {
      selector += `#${element.id}`;
    }

    let className = '';
    if (element.className) {
      if (typeof element.className === 'string') {
        className = element.className;
      } else if (element.className.baseVal !== undefined) {
        className = element.className.baseVal;
      } else {
        className = element.className.toString();
      }

      if (className.trim()) {
        const classes = className.trim().split(/\s+/).slice(0, 3);
        selector += `.${classes.join('.')}`;
      }
    }

    return selector;
  }

  function createElementDisplayText(element) {
    const tagName = element.tagName.toLowerCase();
    let displayText = `<${tagName}`;

    if (element.id) {
      displayText += ` id="${element.id}"`;
    }

    let className = '';
    if (element.className) {
      if (typeof element.className === 'string') {
        className = element.className;
      } else if (element.className.baseVal !== undefined) {
        className = element.className.baseVal;
      } else {
        className = element.className.toString();
      }

      if (className.trim()) {
        const classes = className.trim().split(/\s+/);
        const displayClasses = classes.length > 3 ?
          classes.slice(0, 3).join(' ') + '...' :
          classes.join(' ');
        displayText += ` class="${displayClasses}"`;
      }
    }

    const importantAttrs = ['type', 'name', 'href', 'src', 'alt', 'title'];
    importantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        const truncatedValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
        displayText += ` ${attr}="${truncatedValue}"`;
      }
    });

    displayText += '>';

    const textElements = ['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'a', 'label'];
    if (textElements.includes(tagName) && element.textContent) {
      const textPreview = element.textContent.trim().substring(0, 50);
      if (textPreview) {
        displayText += textPreview.length < element.textContent.trim().length ?
          textPreview + '...' : textPreview;
      }
    }

    displayText += `</${tagName}>`;

    return displayText;
  }

  function createElementInfo(element) {
    const rect = element.getBoundingClientRect();

    return {
      tagName: element.tagName,
      className: getElementClassName(element),
      id: element.id || '',
      textContent: element.textContent?.slice(0, 100) || '',
      styles: getRelevantStyles(element),
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left
      },
      selector: createReadableSelector(element),
      displayText: createElementDisplayText(element),
      elementPath: getElementPath(element),
      source: getFiberSource(element)
    };
  }

  function getFiberSource(element) {
    try {
      let fiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber$'));
      if (!fiberKey) {
        fiberKey = Object.getOwnPropertyNames(element).find(key => key.startsWith('__reactFiber$'));
      }

      let propsKey = Object.keys(element).find(key => key.startsWith('__reactProps$'));
      if (!propsKey) {
        propsKey = Object.getOwnPropertyNames(element).find(key => key.startsWith('__reactProps$'));
      }

      if (propsKey && element[propsKey]) {
        const source = element[propsKey].__source;
        if (source && source.fileName && source.lineNumber && !source.fileName.includes('node_modules')) {
          return {
            fileName: source.fileName,
            lineNumber: source.lineNumber,
            columnNumber: source.columnNumber
          };
        }
      }

      if (!fiberKey) return null;

      let fiber = element[fiberKey];

      while (fiber) {
        let source = fiber._debugSource;

        if (!source && fiber.memoizedProps && fiber.memoizedProps.__source) {
          source = fiber.memoizedProps.__source;
        }

        if (!source && fiber.pendingProps && fiber.pendingProps.__source) {
          source = fiber.pendingProps.__source;
        }

        if (source && source.fileName && source.lineNumber) {
          if (!source.fileName.includes('node_modules')) {
            return {
              fileName: source.fileName,
              lineNumber: source.lineNumber,
              columnNumber: source.columnNumber
            };
          }
        }
        fiber = fiber.return;
      }
    } catch (e) {
      console.warn('Failed to extract React source:', e);
    }
    return null;
  }

  function getElementClassName(element) {
    if (!element.className) return '';

    if (typeof element.className === 'string') {
      return element.className;
    } else if (element.className.baseVal !== undefined) {
      return element.className.baseVal;
    } else {
      return element.className.toString();
    }
  }

  function getElementPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body && current !== document.documentElement) {
      let pathSegment = current.tagName.toLowerCase();

      if (current.id) {
        pathSegment += `#${current.id}`;
      } else if (current.className) {
        const className = getElementClassName(current);
        if (className.trim()) {
          const firstClass = className.trim().split(/\s+/)[0];
          pathSegment += `.${firstClass}`;
        }
      }

      path.unshift(pathSegment);
      current = current.parentElement;

      if (path.length >= 5) break;
    }

    return path.join(' > ');
  }

  function handleMouseMove(e) {
    if (!isInspectorActive) return;

    const target = e.target;
    if (!target || target === document.body || target === document.documentElement) return;

    if (currentHighlight) {
      currentHighlight.classList.remove('inspector-highlight');
    }

    target.classList.add('inspector-highlight');
    currentHighlight = target;

    const elementInfo = createElementInfo(target);

    window.parent.postMessage({
      type: 'INSPECTOR_HOVER',
      elementInfo: elementInfo
    }, '*');
  }

  function handleClick(e) {
    if (!isInspectorActive) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    if (!target || target === document.body || target === document.documentElement) return;

    window._lastClickedElement = target;

    const elementInfo = createElementInfo(target);

    window.parent.postMessage({
      type: 'INSPECTOR_CLICK',
      elementInfo: elementInfo
    }, '*');
  }

  function handleMouseLeave() {
    if (!isInspectorActive) return;

    if (currentHighlight) {
      currentHighlight.classList.remove('inspector-highlight');
      currentHighlight = null;
    }

    window.parent.postMessage({
      type: 'INSPECTOR_LEAVE'
    }, '*');
  }

  function setInspectorActive(active) {
    isInspectorActive = active;

    if (active) {
      if (!inspectorStyle) {
        inspectorStyle = document.createElement('style');
        inspectorStyle.textContent = `
          .inspector-active * {
            cursor: crosshair !important;
          }
          .inspector-highlight {
            outline: 2px solid #3b82f6 !important;
            outline-offset: -2px !important;
            background-color: rgba(59, 130, 246, 0.1) !important;
          }
        `;
        document.head.appendChild(inspectorStyle);
      }

      if (document.body) {
        document.body.classList.add('inspector-active');
      }

      document.addEventListener('mousemove', handleMouseMove, true);
      document.addEventListener('click', handleClick, true);
      document.addEventListener('mouseleave', handleMouseLeave, true);
    } else {
      if (document.body) {
        document.body.classList.remove('inspector-active');
      }

      if (currentHighlight) {
        currentHighlight.classList.remove('inspector-highlight');
        currentHighlight = null;
      }

      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);

      if (inspectorStyle) {
        inspectorStyle.remove();
        inspectorStyle = null;
      }
    }
  }

  window.addEventListener('message', function (event) {
    if (event.data.type === 'INSPECTOR_ACTIVATE') {
      setInspectorActive(event.data.active);
    } else if (event.data.type === 'INSPECTOR_APPLY_STYLE') {
      const target = currentHighlight;
      if (window._lastClickedElement) {
        const { styles } = event.data;
        if (styles) {
          Object.keys(styles).forEach(key => {
            if (key === 'src' && window._lastClickedElement.tagName.toLowerCase() === 'img') {
              window._lastClickedElement.src = styles[key];
            } else {
              window._lastClickedElement.style[key] = styles[key];
            }
          });
        }
      }
    }
  });

  window.addEventListener('scroll', function () {
    window.parent.postMessage({
      type: 'INSPECTOR_SCROLL',
      scrollX: window.scrollX || window.pageXOffset || 0,
      scrollY: window.scrollY || window.pageYOffset || 0
    }, '*');
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.parent.postMessage({ type: 'INSPECTOR_READY', scrollY: window.scrollY || 0, scrollX: window.scrollX || 0 }, '*');
    });
  } else {
    window.parent.postMessage({ type: 'INSPECTOR_READY', scrollY: window.scrollY || 0, scrollX: window.scrollX || 0 }, '*');
  }
})();