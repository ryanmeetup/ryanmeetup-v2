import type { IconType } from "react-icons";
import {
  FaAnchor,
  FaBell,
  FaBridge,
  FaCar,
  FaCheese,
  FaCity,
  FaCow,
  FaDice,
  FaFish,
  FaFlagCheckered,
  FaHorse,
  FaIndustry,
  FaLandmark,
  FaLandmarkDome,
  FaLeaf,
  FaMonument,
  FaMountain,
  FaMountainSun,
  FaMusic,
  FaOilWell,
  FaRoute,
  FaSailboat,
  FaSeedling,
  FaShip,
  FaSnowflake,
  FaStar,
  FaSun,
  FaTractor,
  FaTree,
  FaTreeCity,
  FaUmbrellaBeach,
  FaWater,
  FaWheatAwn,
} from "react-icons/fa6";

export type RegionItem = {
  name: string;
  icon: IconType;
};

const AVAILABLE_USA_FORMS = new Set([
  "AlabamaNameChange.pdf",
  "AlaskaNameChange.pdf",
  "ArizonaNameChange.pdf",
  "ArkansasNameChange.pdf",
  "CaliforniaNameChange.pdf",
  "ColoradoNameChange.pdf",
  "ConnecticutNameChange.pdf",
  "DelawareNameChange.pdf",
  "DistrictOfColumbiaNameChangeForm.pdf",
  "FloridaNameChange.pdf",
  "GeorgiaNameChange.pdf",
  "HawaiiNameChange.pdf",
  "IdahoNameChange.pdf",
  "IllinoisNameChange.pdf",
  "IndianaNameChange.pdf",
  "IowaNameChange.pdf",
  "KansasNameChange.pdf",
  "KentuckyNameChange.pdf",
  "LouisianaNameChange.pdf",
  "MaineNameChange.pdf",
  "MarylandNameChange.pdf",
  "MassachusettsNameChange.pdf",
  "MichiganNameChange.pdf",
  "MinnesotaNameChange.pdf",
  "MississippiNameChange.pdf",
  "MissouriNameChange.pdf",
  "MontanaNameChange.pdf",
  "NebraskaNameChange.pdf",
  "NevadaNameChange.pdf",
  "NewHampshireNameChange.pdf",
  "NewJerseyNameChange.pdf",
  "NewMexicoNameChange.pdf",
  "NewYorkNameChange.pdf",
  "NorthCarolinaNameChange.pdf",
  "NorthDakotaNameChange.pdf",
  "OhioNameChange.pdf",
  "OklahomaNameChange.pdf",
  "OregonNameChange.pdf",
  "PennsylvaniaNameChange.pdf",
  "RhodeIslandNameChange.pdf",
  "SouthCarolinaNameChange.pdf",
  "SouthDakotaNameChange.pdf",
  "TennesseeNameChange.pdf",
  "TexasNameChange.pdf",
  "UtahNameChange.pdf",
  "VermontNameChange.pdf",
  "VirginiaNameChange.pdf",
  "WashingtonNameChange.pdf",
  "WestVirginiaNameChange.pdf",
  "WisconsinNameChange.pdf",
  "WyomingNameChange.pdf",
]);

const AVAILABLE_CANADA_FORMS = new Set([
  "AlbertaNameChange.pdf",
  "BritishColumbiaNameChange.pdf",
  "ManitobaNameChange.pdf",
  "NewBrunswickNameChange.pdf",
  "NewfoundlandNameChange.pdf",
  "NovaScotiaNameChange.pdf",
  "OntarioNameChange.pdf",
  "PrinceEdwardIslandNameChange.pdf",
  "QuebecNameChange.pdf",
  "SaskatchewanNameChange.pdf",
]);

const CANADA_FILENAME_OVERRIDES: Record<string, string> = {
  Alberta: "AlbertaNameChange.pdf",
  "British Columbia": "BritishColumbiaNameChange.pdf",
  Manitoba: "ManitobaNameChange.pdf",
  "New Brunswick": "NewBrunswickNameChange.pdf",
  "Newfoundland and Labrador": "NewfoundlandNameChange.pdf",
  "Nova Scotia": "NovaScotiaNameChange.pdf",
  Ontario: "OntarioNameChange.pdf",
  "Prince Edward Island": "PrinceEdwardIslandNameChange.pdf",
  Quebec: "QuebecNameChange.pdf",
  Saskatchewan: "SaskatchewanNameChange.pdf",
};

const getNameChangeFormPath = (name: string, region: "usa" | "canada") => {
  const filename =
    region === "canada"
      ? CANADA_FILENAME_OVERRIDES[name] ??
        `${name.replace(/[^A-Za-z]/g, "")}NameChange.pdf`
      : `${name.replace(/[^A-Za-z]/g, "")}NameChange.pdf`;

  const availableSet =
    region === "canada" ? AVAILABLE_CANADA_FORMS : AVAILABLE_USA_FORMS;

  if (!availableSet.has(filename)) {
    return null;
  }

  return `/name-change-forms/${region}/${filename}`;
};

export const US_STATES: RegionItem[] = [
  { name: "Alabama", icon: FaSeedling },
  { name: "Alaska", icon: FaSnowflake },
  { name: "Arizona", icon: FaSun },
  { name: "Arkansas", icon: FaTree },
  { name: "California", icon: FaWater },
  { name: "Colorado", icon: FaMountain },
  { name: "Connecticut", icon: FaBridge },
  { name: "Delaware", icon: FaAnchor },
  { name: "Florida", icon: FaUmbrellaBeach },
  { name: "Georgia", icon: FaLeaf },
  { name: "Hawaii", icon: FaWater },
  { name: "Idaho", icon: FaMountainSun },
  { name: "Illinois", icon: FaCity },
  { name: "Indiana", icon: FaFlagCheckered },
  { name: "Iowa", icon: FaTractor },
  { name: "Kansas", icon: FaWheatAwn },
  { name: "Kentucky", icon: FaHorse },
  { name: "Louisiana", icon: FaShip },
  { name: "Maine", icon: FaFish },
  { name: "Maryland", icon: FaAnchor },
  { name: "Massachusetts", icon: FaLandmark },
  { name: "Michigan", icon: FaCar },
  { name: "Minnesota", icon: FaWater },
  { name: "Mississippi", icon: FaWater },
  { name: "Missouri", icon: FaMonument },
  { name: "Montana", icon: FaMountain },
  { name: "Nebraska", icon: FaWheatAwn },
  { name: "Nevada", icon: FaDice },
  { name: "New Hampshire", icon: FaTree },
  { name: "New Jersey", icon: FaRoute },
  { name: "New Mexico", icon: FaSun },
  { name: "New York", icon: FaCity },
  { name: "North Carolina", icon: FaSailboat },
  { name: "North Dakota", icon: FaSnowflake },
  { name: "Ohio", icon: FaIndustry },
  { name: "Oklahoma", icon: FaOilWell },
  { name: "Oregon", icon: FaTree },
  { name: "Pennsylvania", icon: FaBell },
  { name: "Rhode Island", icon: FaAnchor },
  { name: "South Carolina", icon: FaUmbrellaBeach },
  { name: "South Dakota", icon: FaMonument },
  { name: "Tennessee", icon: FaMusic },
  { name: "Texas", icon: FaStar },
  { name: "Utah", icon: FaMountainSun },
  { name: "Vermont", icon: FaLeaf },
  { name: "Virginia", icon: FaLandmarkDome },
  { name: "Washington", icon: FaTreeCity },
  { name: "West Virginia", icon: FaMountain },
  { name: "Wisconsin", icon: FaCheese },
  { name: "Wyoming", icon: FaCow },
];

export const CANADA_PROVINCES: RegionItem[] = [
  { name: "Alberta", icon: FaMountain },
  { name: "British Columbia", icon: FaTree },
  { name: "Manitoba", icon: FaSnowflake },
  { name: "New Brunswick", icon: FaAnchor },
  { name: "Newfoundland and Labrador", icon: FaFish },
  { name: "Nova Scotia", icon: FaSailboat },
  { name: "Ontario", icon: FaCity },
  { name: "Prince Edward Island", icon: FaLeaf },
  { name: "Quebec", icon: FaLandmarkDome },
  { name: "Saskatchewan", icon: FaWheatAwn },
];

const AVAILABLE_FORMS_COUNT = US_STATES.filter((state) =>
  Boolean(getNameChangeFormPath(state.name, "usa")),
).length;
const AVAILABLE_CANADA_FORMS_COUNT = CANADA_PROVINCES.filter((province) =>
  Boolean(getNameChangeFormPath(province.name, "canada")),
).length;

export {
  AVAILABLE_FORMS_COUNT,
  AVAILABLE_CANADA_FORMS_COUNT,
  getNameChangeFormPath,
};
