export interface ItemAction {
  id: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ConfirmCopy {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

export function removalCopy(name: string, hasHistory: boolean): ConfirmCopy {
  if (hasHistory) {
    return {
      title: 'Desativar cadastro',
      message: `“${name}” tem histórico e será desativado, não apagado.`,
      confirmLabel: 'Desativar',
      cancelLabel: 'Cancelar',
    };
  }

  return {
    title: 'Apagar cadastro',
    message: `Apagar “${name}”? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Apagar',
    cancelLabel: 'Cancelar',
  };
}

export function transactionRemovalCopy(description: string): ConfirmCopy {
  return {
    title: 'Apagar lançamento',
    message: `Apagar o lançamento “${description}”? O valor sai do saldo e do histórico.`,
    confirmLabel: 'Apagar',
    cancelLabel: 'Cancelar',
  };
}
