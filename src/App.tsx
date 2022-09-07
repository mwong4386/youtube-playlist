import "./App.css";
import Playlist from "./screens/playlist/Playlist";
import { ActionSheetProvider } from "./screens/actionSheet/ActionSheetContext";

function App() {
  return (
    <div className="App">
      <ActionSheetProvider>
        <Playlist />
      </ActionSheetProvider>
    </div>
  );
}

export default App;
