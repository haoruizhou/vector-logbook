export interface Aircraft {
  aircraft_id: string;
  type_code?: string | null;
  year?: string | null;
  make?: string | null;
  model?: string | null;
  gear_type?: string | null;
  engine_type?: string | null;
  equip_type?: string | null;
  aircraft_class?: string | null;
  complex?: string | null;
  taa?: string | null;
  high_performance?: string | null;
  pressurized?: string | null;
}

export interface Flight {
  id: number;
  date?: string | null;
  aircraft_id?: string | null;
  from_?: string | null;
  to?: string | null;
  route?: string | null;
  time_out?: string | null;
  time_off?: string | null;
  time_on?: string | null;
  time_in?: string | null;
  on_duty?: string | null;
  off_duty?: string | null;
  total_time?: string | null;
  pic?: string | null;
  sic?: string | null;
  night?: string | null;
  solo?: string | null;
  cross_country?: string | null;
  picus?: string | null;
  multi_pilot?: string | null;
  ifr?: string | null;
  examiner?: string | null;
  nvg?: string | null;
  nvg_ops?: string | null;
  distance?: string | null;
  actual_instrument?: string | null;
  simulated_instrument?: string | null;
  hobbs_start?: string | null;
  hobbs_end?: string | null;
  tach_start?: string | null;
  tach_end?: string | null;
  holds?: string | null;
  approach1?: string | null;
  approach2?: string | null;
  approach3?: string | null;
  approach4?: string | null;
  approach5?: string | null;
  approach6?: string | null;
  dual_given?: string | null;
  dual_received?: string | null;
  simulated_flight?: string | null;
  ground_training?: string | null;
  ground_training_given?: string | null;
  instructor_name?: string | null;
  instructor_comments?: string | null;
  person1?: string | null;
  person2?: string | null;
  person3?: string | null;
  person4?: string | null;
  person5?: string | null;
  person6?: string | null;
  pilot_comments?: string | null;
  flight_review?: string | null;
  ipc?: string | null;
  checkride?: string | null;
  faa_6158?: string | null;
  nvg_proficiency?: string | null;
  day_takeoffs?: string | null;
  day_landings_full_stop?: string | null;
  night_takeoffs?: string | null;
  night_landings_full_stop?: string | null;
  all_landings?: string | null;
  [key: string]: string | number | null | undefined;
}

export interface Waypoint {
  ident: string;
  lat: number;
  lon: number;
  type: string;
  name?: string | null;
  country?: string | null;
}

export type ResolveResult = Record<string, Waypoint | null>;

export interface Stats {
  total_flights: number;
  total_landings: number;
  total_time: number;
  total_pic: number;
  total_sic: number;
  total_night: number;
  total_cross_country: number;
  total_actual_instrument: number;
  total_simulated_instrument: number;
  by_year: Record<string, number>;
  by_aircraft: Record<string, number>;
  [key: string]: number | Record<string, number>;
}

export interface JourneyAirport {
  ident: string;
  name: string | null;
  country: string | null;
  lat: number;
  lon: number;
  visits: number;
  first_date: string | null;
  last_date: string | null;
}
export interface JourneyLeg {
  from_ident: string;
  to_ident: string;
  from_lat: number;
  from_lon: number;
  to_lat: number;
  to_lon: number;
  count: number;
  last_date: string | null;
}
export interface JourneyMilestone {
  key: string;
  label: string;
  detail: string | null;
  date: string | null;
}
export interface JourneyIdentity {
  callsign: string | null;
  first_flight_year: string | null;
  home_base: string | null;
  total_hours: number;
  airport_count: number;
  country_count: number;
  aircraft_count: number;
  people_count: number;
  night_hours: number;
  longest_leg_nm: number;
  furthest_from_home_nm: number;
}
export interface Journey {
  airports: JourneyAirport[];
  legs: JourneyLeg[];
  identity: JourneyIdentity;
  milestones: JourneyMilestone[];
}
