import { IS_MOM_APP } from '../config/app-profile.js';

/**
 * "+ New" next to project/person selects in add & edit task modals (Mom app).
 * @param {object} ctx
 * @param {(name: string) => string|null} ctx.addPile
 * @param {(attrs: object) => string|null} ctx.addPerson
 * @param {(selectId: string, selectedId?: string) => void} ctx.updatePileSelectOptions
 * @param {(selectId: string, selectedId?: string) => void} ctx.updatePersonSelectOptions
 * @param {(msg: string) => void} ctx.showToast
 */
export function wireInlineEntityCreates(ctx) {
  if (!IS_MOM_APP) return;

  const pairs = [
    { selectId: 'pile-select', btnId: 'pile-select-new', kind: 'pile' },
    { selectId: 'person-select', btnId: 'person-select-new', kind: 'person' },
    { selectId: 'edit-pile', btnId: 'edit-pile-new', kind: 'pile' },
    { selectId: 'edit-person', btnId: 'edit-person-new', kind: 'person' }
  ];

  pairs.forEach(({ selectId, btnId, kind }) => {
    const btn = document.getElementById(btnId);
    if (!btn || btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const promptLabel = kind === 'pile' ? 'New project name' : 'New person name';
      const raw = window.prompt(promptLabel);
      if (raw == null) return;
      const name = raw.trim();
      if (!name) {
        ctx.showToast('Name cannot be empty');
        return;
      }
      if (kind === 'pile') {
        const id = ctx.addPile(name);
        if (!id) {
          ctx.showToast('Could not add project');
          return;
        }
        ctx.updatePileSelectOptions(selectId, id);
        ctx.showToast('Project added');
      } else {
        const id = ctx.addPerson({ name, group: 'friends' });
        if (!id) {
          ctx.showToast('Could not add person');
          return;
        }
        ctx.updatePersonSelectOptions(selectId, id);
        ctx.showToast('Person added');
      }
    });
  });
}
