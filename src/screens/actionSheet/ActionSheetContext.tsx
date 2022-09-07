import { createContext, useState } from "react";
import MActionSheetItem from "../../models/MActionSheetItem";
import ActionSheet from "./ActionSheet";

export const ActionSheetContext = createContext({
  setActionSheet: (items: MActionSheetItem[]) => {},
  open: () => {},
  close: () => {},
});

interface props {
  children: JSX.Element | JSX.Element[] | string | string[];
}
export const ActionSheetProvider = ({ children }: props) => {
  const [items, setItems] = useState<MActionSheetItem[]>([]);
  const [active, setActive] = useState<boolean>(false);
  const setActionSheet = (items: MActionSheetItem[]) => {
    setItems(items);
  };
  const open = () => {
    setActive(true);
  };
  const close = () => {
    setActive(false);
  };
  return (
    <>
      <ActionSheet items={items} active={active} close={close} />
      <ActionSheetContext.Provider value={{ setActionSheet, open, close }}>
        {children}
      </ActionSheetContext.Provider>
    </>
  );
};
