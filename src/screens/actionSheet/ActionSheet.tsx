import MActionSheetItem from "../../models/MActionSheetItem";
import { BackIcon } from "../icons";
import Modal from "../modal/Modal";
import modalStyles from "../modal/Modal.module.css";
import ModalChromeHeader from "../modal/ModalChromeHeader";
import styles from "./ActionSheet.module.css";
import ActionSheetItem from "./ActionSheetItem";

interface props {
  items: MActionSheetItem[];
  active: boolean;
  close: () => void;
}
const ActionSheet = ({ items, active, close }: props) => {
  const isActive = active && items.length > 0;
  const headerItem = items[0]?.kind === "sheet-header" ? items[0] : null;
  const rowItems = headerItem ? items.slice(1) : items;

  return (
    <Modal active={isActive} close={close}>
      {headerItem ? (
        <div className={modalStyles["chrome-panel"]}>
          <ModalChromeHeader
            title={headerItem.description || ""}
            variant="centered"
            closeIcon={<BackIcon />}
            closeLabel={`Back from ${headerItem.description || "menu"}`}
            onClose={() => headerItem.callback?.()}
          />
          <div id="rows" className={styles["settings-panel"]}>
            {rowItems.map((item) => {
              return <ActionSheetItem key={item.id} item={item} close={close} />;
            })}
          </div>
        </div>
      ) : (
        <div id="rows" className={styles["settings-panel"]}>
          {rowItems.map((item) => {
            return <ActionSheetItem key={item.id} item={item} close={close} />;
          })}
        </div>
      )}
    </Modal>
  );
};

export default ActionSheet;
