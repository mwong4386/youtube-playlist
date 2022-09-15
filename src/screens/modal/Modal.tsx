import styles from "./Modal.module.css";
interface props {
  active: boolean;
  close: () => void;
  children: JSX.Element | JSX.Element[] | string | string[];
}
const Modal = ({ active, close, children }: props) => {
  const onClick = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).id === "backdrop") {
      close();
    }
  };
  return (
    <div
      id="backdrop"
      className={`${styles["backdrop"]} ${active ? styles["active"] : ""}`}
      onClick={onClick}
    >
      <div id="container" className={styles["container"]}>
        {children}
      </div>
    </div>
  );
};

export default Modal;
