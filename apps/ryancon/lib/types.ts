// Types
import type { ReactNode } from 'react';

// #region Contentful Types
type ContentfulSys = {
  id: string;
  type: string;
  linkType: string;
};

type ContentfulFile = {
  contentType: string;
  details: {
    image: {
      height: number;
      width: number;
    };
    size: number;
  };
  fileName: string;
  url: string;
}

type ContentfulImage = {
  fields: {
    title: string;
    description: string;
    file: ContentfulFile;
  };
  metaData: {
    tags: string[];
  };
  sys: {
    createdAt: string;
    environment: {
      sys: ContentfulSys;
    };
  };
  id: string;
  locale: string;
  revision: number;
  space: {
    sys: ContentfulSys;
    type: string;
    updatedAt: string;
  };
};
// #endregion

// #region Ryan Meetup Types
type FrequentlyAskedQuestion = {
  question: string;
  answer: string;
};

type Sponsor = {
  name: string;
  href: string;
  eventsSponsored: number;
  image: ContentfulImage;
};

type Testimonial = {
  lastName?: string;
  headshot?: ContentfulImage;
  quote: string;
  location: string;
};
// #endregion

type Route = {
  icon: ReactNode;
  text: string;
  href: string;
};

type ContactFormFields = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
};

export type {
  FrequentlyAskedQuestion,
  Sponsor,
  ContentfulImage,
  Route,
  ContactFormFields,
  Testimonial,
};
