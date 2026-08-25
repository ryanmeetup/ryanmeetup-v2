"use client";

import {
  Button,
  ErrorCallout,
  FieldError,
  FormActions,
  Input,
  RequiredFieldsNote,
  SuccessCallout,
  Textarea,
} from "@ryanmeetup/ui";
import { validateEmail } from "@ryanmeetup/utils";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast, { Toaster } from "react-hot-toast";
import { BiMailSend as Send } from "react-icons/bi";
import { sendContactMessage } from "./sendContactMessage";

export type ContactFormFields = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
};
export type ContactFormProps = {
  initialSubject?: string;
  initialMessage?: string;
  layout?: "compact" | "wide";
  messagePlaceholder?: string;
};

const requiredMessages: Partial<Record<keyof ContactFormFields, string>> = {
  firstName: "Error: must provide a first name",
  lastName: "Error: must provide a last name",
  subject: "Error: must provide a subject",
  message: "Error: must provide a message",
};

const ContactForm = ({
  initialSubject = "",
  initialMessage = "",
  layout = "wide",
  messagePlaceholder = "What Ryan business brings you here?",
}: ContactFormProps) => {
  const defaultValues = useMemo<ContactFormFields>(
    () => ({
      firstName: "",
      lastName: "",
      email: "",
      subject: initialSubject,
      message: initialMessage,
    }),
    [initialMessage, initialSubject],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<ContactFormFields>({ defaultValues });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const required = (name: keyof ContactFormFields) => ({
    onBlur: (
      event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) =>
      event.target.value === ""
        ? setError(name, { message: requiredMessages[name] })
        : clearErrors(name),
  });

  const notifySuccess = () =>
    toast.custom(() => (
      <SuccessCallout>
        <strong className="block">Email sent!</strong>
        <span className="block font-normal">
          Expect an email back from Ryan soon!
        </span>
      </SuccessCallout>
    ));

  const send = async (form: ContactFormFields) => {
    setLoading(true);
    try {
      await sendContactMessage(form);
      notifySuccess();
      reset(defaultValues);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The message could not be sent. Please try again.";
      toast.custom(() => <ErrorCallout>{message}</ErrorCallout>, {
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = layout === "compact" ? "col-span-2 sm:col-span-1" : "";
  return (
    <>
      <form
        onSubmit={handleSubmit(send)}
        className={
          layout === "compact"
            ? "grid w-full grid-cols-2 gap-6"
            : "grid w-full grid-cols-1 gap-6 2xl:grid-cols-2"
        }
      >
        <div className={fieldClass}>
          <Input
            label="First Name"
            placeholder="Ryan"
            required
            {...register("firstName", required("firstName"))}
          />
        </div>
        <div className={fieldClass}>
          <Input
            label="Last Name"
            placeholder="Smith"
            required
            {...register("lastName", required("lastName"))}
          />
        </div>
        <div className={fieldClass}>
          <Input
            label="Email Address"
            placeholder="ryan@ryanmeetup.com"
            type="email"
            required
            {...register("email", {
              onBlur: (event) =>
                validateEmail(event.target.value)
                  ? clearErrors("email")
                  : setError("email", {
                      message: "Error: invalid email address",
                    }),
            })}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div className={fieldClass}>
          <Input
            label="Subject"
            placeholder="Official Ryan Business"
            required
            {...register("subject", required("subject"))}
          />
        </div>
        <div className={layout === "compact" ? "col-span-2" : "2xl:col-span-2"}>
          <Textarea
            id="message"
            label="Message"
            placeholder={messagePlaceholder}
            required
            {...register("message", required("message"))}
          />
        </div>
        <FormActions
          className={layout === "compact" ? "col-span-2" : "2xl:col-span-2"}
        >
          <RequiredFieldsNote />
          <Button
            type="submit"
            className="w-full sm:w-auto sm:min-w-[180px]"
            leftIcon={<Send />}
            disabled={loading || Object.keys(errors).length !== 0}
            loading={loading}
            loadingText="Sending..."
          >
            Send
          </Button>
        </FormActions>
      </form>
      <Toaster position="bottom-center" />
    </>
  );
};

export { ContactForm };
