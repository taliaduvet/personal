export function showToast(message, onUndo) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = message + (onUndo ? '<span class="undo-btn">Undo</span>' : '');
  toast.classList.add('visible');
  if (onUndo) {
    const undoBtn = toast.querySelector('.undo-btn');
    if (undoBtn) undoBtn.onclick = () => {
      onUndo();
      toast.classList.remove('visible');
    };
  }
  setTimeout(() => toast.classList.remove('visible'), 5000);
}
