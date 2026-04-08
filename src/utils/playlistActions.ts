export const cancelDeleteAllConfirmation = (closeModal: () => void) => {
  closeModal();
};

export const confirmDeleteAllConfirmation = (
  deleteAll: () => void,
  closeModal: () => void
) => {
  deleteAll();
  closeModal();
};
