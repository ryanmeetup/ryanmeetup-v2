"use client";

import { useState, useEffect } from "react";

// Components
import { Input, Text, Textarea, Button } from "@/components/global";
import { BiMailSend as Send } from "react-icons/bi";
import { Loader } from "@/components/contact";
import toast, { Toaster } from "react-hot-toast";
import { FaCheckCircle as Check } from "react-icons/fa";

// Types
import type { ContactFormFields } from "@/lib/types";

// Utilities
import { useForm } from "react-hook-form";
import { validateEmail } from "@/utils/validate";
import emailjs from "@emailjs/browser";

const ContactForm = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm();

  const [loading, setLoading] = useState<boolean>(false);
  const isTestMode = process.env.NEXT_PUBLIC_E2E_TESTS === "true";

  const send = (form: ContactFormFields) => {
    setLoading(true);

    const completeSend = () => {
      sendSuccessAlert();
      setLoading(false);
      reset();
      toggleErrorFlags();
    };

    if (isTestMode) {
      completeSend();
      return;
    }

    setTimeout(() => {
      const templateId = process.env.NEXT_PUBLIC_EMAIL_TEMPLATE_ID;
      const userId = process.env.NEXT_PUBLIC_EMAIL_USER_ID;
      const serviceId = process.env.NEXT_PUBLIC_EMAIL_SERVICE_ID;

      emailjs.send(serviceId as string, templateId as string, form, userId);
      completeSend();
    }, 1000);
  };

  const checkEmail = (email: string) => {
    const valid = validateEmail(email);

    if (valid) clearErrors("email");
    else setError("email", { message: "Error: invalid email address" });
  };

  const toggleErrorFlags = () => {
    setError("firstName", { message: "Error: must provide a first name" });
    setError("lastName", { message: "Error: must provide a last name" });
    setError("subject", { message: "Error: must provide a subject" });
    setError("message", { message: "Error: must provide a message" });
  };

  useEffect(() => {
    toggleErrorFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendSuccessAlert = () =>
    toast((t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full rounded-2xl bg-white/95 text-black shadow-lg pointer-events-auto grid grid-cols-12 p-4 dark:bg-black/80 dark:text-white`}
      >
        <div className="col-span-1 flex items-center justify-center">
          <Check className="h-7 w-7 fill-emerald-500 shrink-0" />
        </div>
        <div className="col-span-10 pl-4 pr-6">
          <h1 className="text-lg font-cooper">Email sent!</h1>
          <Text className="text-sm text-black/70 dark:text-white/70">
            Expect an email back from Ryan soon!
          </Text>
        </div>
      </div>
    ));

  return (
    <>
      <form className="w-full grid grid-cols-2 gap-x-6 gap-y-6">
        <div className="col-span-1">
          <Input
            label="First Name"
            placeholder="Ryan"
            required
            {...register("firstName", {
              onBlur: (event) =>
                event.target.value === ""
                  ? setError("firstName", {
                      message: "Error: must provide a first name",
                    })
                  : clearErrors("firstName"),
            })}
          />
        </div>

        <div className="col-span-1">
          <Input
            label="Last Name"
            placeholder="Smith"
            required
            {...register("lastName", {
              onBlur: (event) =>
                event.target.value === ""
                  ? setError("lastName", {
                      message: "Error: must provide a last name",
                    })
                  : clearErrors("lastName"),
            })}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Input
            label="Email Address"
            placeholder="ryan@ryanmeetup.com"
            type="text"
            required
            {...register("email", {
              onBlur: (event) => checkEmail(event.target.value),
            })}
          />
          {errors.email && (
            <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
              {errors.email.message as string}
            </Text>
          )}
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Input
            label="Subject"
            placeholder="Official Ryan Business"
            required
            {...register("subject", {
              onBlur: (event) =>
                event.target.value === ""
                  ? setError("subject", {
                      message: "Error: must provide a subject",
                    })
                  : clearErrors("subject"),
            })}
          />
        </div>

        <div className="col-span-2">
          <Textarea
            id="message"
            label="Message"
            required
            {...register("message", {
              onBlur: (event) =>
                event.target.value === ""
                  ? setError("message", {
                      message: "Error: must provide a message",
                    })
                  : clearErrors("message"),
            })}
          />
        </div>

        <div className="col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Text className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
            All fields required
          </Text>
          <Button
            className="w-full sm:w-auto sm:min-w-[180px]"
            leftIcon={loading ? <Loader /> : <Send />}
            onClick={handleSubmit((data) => send(data as ContactFormFields))}
            disabled={Object.keys(errors).length !== 0}
          >
            {loading ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>

      <Toaster position="bottom-center" />
    </>
  );
};

export { ContactForm };
