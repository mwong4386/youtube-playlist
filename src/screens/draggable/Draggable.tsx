import styles from "./Draggable.module.css";
interface props {
  id: string;
  isDragging: boolean;
  children: JSX.Element | JSX.Element[] | string | string[];
  setDraggingElement: React.Dispatch<any>;
  onMoveTo: (toId: string) => void;
}

const Draggable = ({
  id,
  isDragging,
  setDraggingElement,
  onMoveTo,
  children,
}: props) => {
  const onDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    setDraggingElement(id);
  };
  const onDrop = (event: React.MouseEvent<HTMLDivElement>) => {
    onMoveTo(id);
    setDraggingElement(undefined);
  };
  const onDragOver = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  return (
    <>
      <div
        className={`${isDragging ? styles["placeholder"] : ""}`}
        draggable="true"
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {children}
      </div>
    </>
  );
};

export default Draggable;
