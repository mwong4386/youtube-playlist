import MActionSheetItem from "../../models/MActionSheetItem";
import Modal from "../modal/Modal";
import styles from "./ActionSheet.module.css";
import ActionSheetItem from "./ActionSheetItem";

interface props {
  items: MActionSheetItem[];
  active: boolean;
  close: () => void;
}
const ActionSheet = ({ items, active, close }: props) => {
  const isActive = active && items.length > 0;

  return (
    <Modal active={isActive} close={close}>
      <div id="rows" className={styles["settings-panel"]}>
        {items.map((item) => {
          return <ActionSheetItem key={item.id} item={item} close={close} />;
        })}
      </div>
    </Modal>
  );
};

export default ActionSheet;
