export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  });
  children.forEach(child => node.append(child));
  return node;
}

export function progress(value = 0) {
  const wrap = el('div', { className: 'v17-progress' });
  const fill = el('i');
  fill.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
  wrap.append(fill);
  return wrap;
}

export function card(title, children = []) {
  return el('section', { className: 'v17-card' }, [el('h2', { text: title }), ...children]);
}
