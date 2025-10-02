export const familiesData = [
  {
    id: 1,
    code: "VOYAGE",
    imageUrl: "voyage-placeholder.svg",
    contractTypes: [
      {
        id: 1,
        code: "INDIVIDUAL_FAMILY",
        imageUrl: "person-placeholder.svg",
      },
      {
        id: 2,
        code: "GROUP",
        imageUrl: "group-placeholder.svg",
      },
    ],
    reasons: [
      {
        id: 1,
        code: "TOURISM",
        imageUrl: "tourism-placeholder.svg",
      },
      {
        id: 2,
        code: "STUDY",
        imageUrl: "studies-placeholder.svg",
      },
      {
        id: 3,
        code: "BUSINESS",
        imageUrl: "business-placeholder.svg",
      },
    ],
    additionalOptions: [
      {
        id: 1,
        code: "SPOUSE",
        defaultValue: 1,
        possibleValues: [1, 2, 3],
      },
      {
        id: 2,
        code: "CHILDREN",
        defaultValue: 1,
        possibleValues: [1, 2, 3, 4, 5],
      },
      {
        id: 3,
        code: "ASCENDANTS",
        defaultValue: 1,
        possibleValues: [1, 2],
      },
      {
        id: 4,
        code: "VEHICLES_UNDER_3_5T",
        defaultValue: null,
        possibleValues: [],
      },
      {
        id: 5,
        code: "INSURED_OVER_70",
        defaultValue: null,
        possibleValues: [],
      },
    ],
  },
  {
    id: 2,
    code: "AUTO",
    imageUrl: "auto-placeholder.svg",
    contractTypes: [
      {
        id: 1,
        code: "MONO",
        imageUrl: "mono-placeholder.svg",
      },
      {
        id: 2,
        code: "FLEET",
        imageUrl: "fleet-placeholder.svg",
      },
    ],
    reasons: [],
    additionalOptions: [],
  },
  {
    id: 3,
    code: "SANTE",
    imageUrl: "sante-placeholder.svg",
    contractTypes: [],
    reasons: [],
    additionalOptions: [],
  },
];
