"use client";

import { useState } from "react";
import { MdCheck as Check } from "react-icons/md";

// Components
import { Modal, ModalActions } from "@ryanmeetup/ui";

// Utilities
import { useRouter } from "next/navigation";
import useLocalStorage from "@/hooks/useLocalStorage";

const BryanModal = () => {
  const localStorageKey = "bryanCheck";
  const checkboxId = "bryan-check";

  const [isChecked, handleChange] = useLocalStorage(localStorageKey, false);
  const [showModal, setShowModal] = useState<boolean>(true);

  const router = useRouter();

  return (
    <Modal
      open={showModal}
      setIsOpen={setShowModal}
      title="Welcome to the Ryan Meetup."
      closable={false}
      actions={
        <ModalActions
          cancelLabel="Leave"
          confirmDisabled={!isChecked}
          confirmLabel="Continue"
          onCancel={() => router.push("/goodbye")}
          onConfirm={() => setShowModal(false)}
        />
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-black/10 bg-white/80 p-4 text-black/80 dark:border-white/15 dark:bg-white/10 dark:text-white/80">
        <input
          id={checkboxId}
          className="peer sr-only"
          type="checkbox"
          checked={isChecked}
          onChange={handleChange}
        />
        <label
          className="flex cursor-pointer items-start gap-3 text-sm font-semibold tracking-wide"
          htmlFor={checkboxId}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
              isChecked
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/25 bg-white text-white dark:border-white/35 dark:bg-black/40"
            }`}
          >
            <Check
              className={`h-4 w-4 transition ${isChecked ? "opacity-100" : "opacity-0"}`}
            />
          </span>
          I certify my name is not Bryan or Brian.
        </label>
      </div>
    </Modal>
  );
};

export { BryanModal };
