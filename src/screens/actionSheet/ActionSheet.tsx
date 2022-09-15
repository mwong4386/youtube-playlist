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
    close();
  };

  return (
    <>
      <div
        className={`${styles["backdrop"]} ${isActive ? styles["active"] : ""}`}
        onClick={onClick}
      ></div>
      <div
        id="rows"
        className={`${styles["container"]} ${isActive ? styles["active"] : ""}`}
      >
        {items.map((item) => {
          return <ActionSheetItem key={item.id} item={item} close={close} />;
        })}
      </div>
    </>
  );
};

export default ActionSheet;
