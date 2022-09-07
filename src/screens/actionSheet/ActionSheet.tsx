import { useState } from "react";
import MActionSheetItem from "../../models/MActionSheetItem";
import styles from "./ActionSheet.module.css";
import ActionSheetItem from "./ActionSheetItem";

interface props {
  items: MActionSheetItem[];
  active: boolean;
  close: () => void;
}
const ActionSheet = ({ items, active, close }: props) => {
  const isActive = active && items.length > 0;
  const onClick = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).id === "container") {
      close();
    }
  };

  return (
    <div
      id="container"
      className={`${styles["container"]} ${isActive ? styles["active"] : ""}`}
      onClick={onClick}
    >
      <div
        id="rows"
        className={`${styles["rows"]} ${isActive ? styles["active"] : ""}`}
      >
        {items.map((item) => {
          return <ActionSheetItem key={item.id} item={item} close={close} />;
        })}
      </div>
    </div>
  );
};

export default ActionSheet;
