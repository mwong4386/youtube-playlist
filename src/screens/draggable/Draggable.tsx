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
  const onDragStart = (_event: React.DragEvent<HTMLDivElement>) => {
    setDraggingElement(id);
  };
  const onDrop = (_event: React.DragEvent<HTMLDivElement>) => {
    _event.stopPropagation();
    onMoveTo(id);
    setDraggingElement(undefined);
  };
  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  return (
    <>
      <div
        className={`${isDragging ? styles["placeholder"] : ""}`}
        draggable="true"
        onDragStart={onDragStart}
        onDragEnd={() => {
          setDraggingElement(undefined);
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {children}
      </div>
    </>
  );
};

export default Draggable;
