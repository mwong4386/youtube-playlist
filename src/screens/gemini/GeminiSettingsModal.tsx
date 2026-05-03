import { useEffect, useState } from "react";
import Modal from "../modal/Modal";
import ModalChromeHeader from "../modal/ModalChromeHeader";
import modalStyles from "../modal/Modal.module.css";
import { BackIcon } from "../icons";
import styles from "./GeminiSettingsModal.module.css";
import {
  createRemoveGeminiApiKeyFeedback,
  createSaveGeminiApiKeyFeedback,
  getMaskedGeminiApiKeyLabel,
} from "../../utils/geminiSettings";

interface Props {
  active: boolean;
  close: () => void;
  backToSettings: () => void;
  geminiApiKey: string;
  onSaveGeminiApiKey: (value: string) => Promise<void>;
  onRemoveGeminiApiKey: () => Promise<void>;
}

const GeminiSettingsModal = ({
  active,
  close,
  backToSettings,
  geminiApiKey,
  onSaveGeminiApiKey,
  onRemoveGeminiApiKey,
}: Props) => {
  const [geminiInputValue, setGeminiInputValue] = useState("");
  const [geminiStatus, setGeminiStatus] = useState("");

  useEffect(() => {
    if (!active) {
      setGeminiInputValue("");
      setGeminiStatus("");
    }
  }, [active]);

  const saveGeminiApiKey = async () => {
    const result = await createSaveGeminiApiKeyFeedback(
      geminiInputValue,
      onSaveGeminiApiKey,
    );
    setGeminiInputValue(result.inputValue);
    setGeminiStatus(result.status);
  };

  const removeGeminiApiKey = async () => {
    const result = await createRemoveGeminiApiKeyFeedback(
      onRemoveGeminiApiKey,
      geminiInputValue,
    );
    setGeminiInputValue(result.inputValue);
    setGeminiStatus(result.status);
  };

  return (
    <Modal active={active} close={close}>
      <div className={styles.panel}>
        <ModalChromeHeader
          title="Setup Gemini"
          closeIcon={<BackIcon />}
          closeLabel="Back to settings"
          onClose={backToSettings}
        />
        <section className={styles.section} aria-labelledby="gemini-api-key-title">
          <p className={styles.note}>
            Save the API key used by song analysis. Stored locally in this
            browser for this extension.
          </p>
          <label className={styles.field}>
            <span id="gemini-api-key-title" className={styles.fieldLabel}>
              Gemini API key
            </span>
            <input
              type="password"
              value={geminiInputValue}
              onChange={(event) => {
                setGeminiInputValue(event.currentTarget.value);
                setGeminiStatus("");
              }}
              placeholder="Paste Gemini API key"
              className={styles.textInput}
            />
          </label>
          <div className={styles.actions}>
            <button
              type="button"
              className={modalStyles["chrome-confirm-button"]}
              onClick={saveGeminiApiKey}
            >
              Save key
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!geminiApiKey}
              onClick={removeGeminiApiKey}
            >
              Remove key
            </button>
          </div>
          <p className={`${styles.note} ${styles.status}`}>
            {geminiStatus ||
              getMaskedGeminiApiKeyLabel(geminiApiKey) ||
              "No Gemini API key saved."}
          </p>
        </section>
      </div>
    </Modal>
  );
};

export default GeminiSettingsModal;
