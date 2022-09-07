import MActionSheetItem from "../../models/MActionSheetItem";
import styles from "./ActionSheet.module.css";

interface props {
  item: MActionSheetItem;
  close: () => void;
}
const ActionSheetItem = ({ item, close }: props) => {
  const onClick = () => {
    if (item.callback) {
      item.callback();
    }
    close();
  };
  return (
    <div className={styles["row"]} onClick={onClick}>
      <p>{item.description}</p>
    </div>
  );
};

export default ActionSheetItem;
