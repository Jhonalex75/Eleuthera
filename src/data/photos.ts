/**
 * Stage 3 acceptance photographs.
 *
 * The geotag marker burned into each frame is the table tag, so a photograph
 * resolves to a row in the register, and each one's date
 * matches that table's alignment-and-torque acceptance date. That is what makes
 * the record auditable rather than merely asserted.
 *
 * A frame whose marker is not legible is not published: it proves an activity
 * happened but not where. `table` stays nullable so such a frame is handled
 * rather than crashing if one is ever added.
 *
 * Files live in public/photos/ and are served straight off Firebase Hosting, so
 * they never enter the JavaScript bundle.
 */
export type PhotoRecord = {
  file: string;
  /** table number read off the geotag marker, null when not legible */
  table: number | null;
  /** marker as printed in the frame */
  marker: string | null;
  activity: string;
  taken: string;
  gps: string;
  bearing: string;
};

export const PHOTOS: PhotoRecord[] = [
  {
    file: "/photos/table-546.jpg",
    table: 546,
    marker: "#M546",
    activity: "Tilt and level check — digital level on the purlin",
    taken: "26-Aug-2026 09:12",
    gps: "25.3590N 76.4842W",
    bearing: "74° E",
  },
  {
    file: "/photos/table-544.jpg",
    table: 544,
    marker: "#M544",
    activity: "Girder-to-pile connection, erected rows behind",
    taken: "27-Aug-2026 08:38",
    gps: "25.3591N 76.4834W",
    bearing: "310° NW",
  },
  {
    file: "/photos/table-507.jpg",
    table: 507,
    marker: "#M507",
    activity: "Joint OE / ILTEKNO levelling check",
    taken: "29-Aug-2026 09:23",
    gps: "25.3593N 76.4854W",
    bearing: "317° NW",
  },
  {
    file: "/photos/table-501.jpg",
    table: 501,
    marker: "#M501",
    activity: "Torque with calibrated wrench — M12, 68 ± 3 N·m",
    taken: "31-Aug-2026 09:12",
    gps: "25.3594N 76.4843W",
    bearing: "294° NW",
  },
  {
    file: "/photos/table-488.jpg",
    table: 488,
    marker: "#M488",
    activity: "Torque at the pile connection — last table accepted",
    taken: "01-Sep-2026 08:54",
    gps: "25.3595N 76.4843W",
    bearing: "275° W",
  },
];
