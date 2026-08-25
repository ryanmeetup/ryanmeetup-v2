"use client";

import { FormEvent, useState } from "react";
import { Button, Card, DropdownSelect, ErrorCallout, FormStatus, Heading, Input, Kicker, Text, Textarea } from "@ryanmeetup/ui";
import { FiCheck, FiStar } from "react-icons/fi";
import type { ReviewsData } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FiStar key={star} aria-hidden className={star <= Math.round(rating) ? "fill-nametag text-nametag" : "text-black/20 dark:text-white/20"} />
      ))}
    </span>
  );
}

export function Reviews({ data, productId }: { data: ReviewsData; productId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        rating: Number(rating),
        name: form.get("name"),
        email: form.get("email"),
        title: form.get("title"),
        body: form.get("body"),
      }),
    });
    const payload = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || "Your review could not be submitted.");
      return;
    }
    setSuccess(true);
    setShowForm(false);
  }

  return (
    <section id="reviews" className="border-t border-black/10 py-16 dark:border-white/10 sm:py-20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Kicker>Customer dispatches</Kicker>
          <Heading size="h2" className="mt-2 text-3xl sm:text-4xl">The Ryans have spoken</Heading>
          <div className="mt-3 flex items-center gap-3 text-sm text-black/65 dark:text-white/65">
            <Stars rating={data.averageRating} />
            <span>{data.count ? `${data.averageRating.toFixed(1)} from ${data.count} review${data.count === 1 ? "" : "s"}` : "No reviews yet"}</span>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close form" : "Write a review"}</Button>
      </div>

      {success && <FormStatus className="mt-6" title="Review received" icon={<FiCheck aria-hidden />}>Thanks. It will appear after moderation.</FormStatus>}
      {showForm && (
        <Card className="mt-8 max-w-2xl" size="lg">
          <form onSubmit={submitReview} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Name" name="name" required placeholder="Ryan, ideally" onChange={() => undefined} />
              <Input label="Email" name="email" type="email" required placeholder="For review verification" onChange={() => undefined} />
            </div>
            <DropdownSelect label="Rating" variant="field" required value={rating} onChange={setRating} options={[5, 4, 3, 2, 1].map((value) => ({ label: `${value} stars`, value: String(value) }))} />
            <Input label="Review title" name="title" required placeholder="A very Ryan opinion" onChange={() => undefined} />
            <Textarea id="review-body" label="Review" name="body" required placeholder="How did the gear treat you?" onChange={() => undefined} />
            {error && <ErrorCallout>{error}</ErrorCallout>}
            <Button type="submit" loading={loading} loadingText="Submitting" fullWidth>Submit review</Button>
          </form>
        </Card>
      )}

      {data.reviews.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {data.reviews.map((review) => (
            <Card key={review.id} size="lg">
              <div className="flex items-center justify-between gap-3"><Stars rating={review.rating} /><time className="text-xs text-black/50 dark:text-white/50" dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</time></div>
              {review.title && <Heading size="h3" className="mt-4 text-xl">{review.title}</Heading>}
              <Text className="mt-2">{review.body}</Text>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em]">{review.reviewerName}{review.verified ? " · Verified buyer" : ""}</p>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-black/20 p-8 text-center dark:border-white/20">
          <Heading size="h3" className="text-xl">Be the first to report back</Heading>
          <Text className="mt-2">This product is waiting for its first official Ryan review.</Text>
        </div>
      )}
    </section>
  );
}
