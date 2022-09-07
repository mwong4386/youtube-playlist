import { useContext } from "react";
import { ActionSheetContext } from "./ActionSheetContext";

const useActionSheet = () => {
  return useContext(ActionSheetContext);
};

export default useActionSheet;
