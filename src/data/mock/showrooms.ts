import { Showroom, Workshop } from "@/types/domain";

export const mockShowrooms: Showroom[] = [
  {
    id: "sr-hazratganj",
    city_id: "city-lucknow",
    name: "Vrooma Flagship Hazratganj",
    address: "14/A, MG Marg, Hazratganj, Lucknow, UP 226001",
    phone: "+91 522 409 8800",
    hours: {
      "Mon - Sat": "09:30 AM - 08:00 PM",
      Sunday: "10:00 AM - 07:00 PM",
    },
    lat: 26.852,
    lng: 80.946,
  },
  {
    id: "sr-gomtinagar",
    city_id: "city-lucknow",
    name: "Vrooma Experience Center Gomti Nagar",
    address: "Vibhuti Khand, Gomti Nagar, Lucknow, UP 226010",
    phone: "+91 522 419 9900",
    hours: {
      "Mon - Sat": "09:30 AM - 08:00 PM",
      Sunday: "10:00 AM - 07:00 PM",
    },
    lat: 26.864,
    lng: 81.002,
  },
  {
    id: "sr-kanpur-mall",
    city_id: "city-kanpur",
    name: "Vrooma Kanpur City Center",
    address: "Mall Road, Near Phoolbagh, Kanpur, UP 208001",
    phone: "+91 512 301 4400",
    hours: {
      "Mon - Sat": "10:00 AM - 07:30 PM",
      Sunday: "10:30 AM - 06:30 PM",
    },
    lat: 26.467,
    lng: 80.354,
  },
];

export const mockWorkshops: Workshop[] = [
  {
    id: "ws-transportnagar",
    city_id: "city-lucknow",
    name: "Vrooma Central Workshop Transport Nagar",
    address: "Plot 42, Phase 1, Transport Nagar, Lucknow, UP 226012",
    phone: "+91 522 450 1122",
    bays: 16,
    hours: {
      "Mon - Sat": "08:30 AM - 07:00 PM",
      Sunday: "Closed (Emergency breakdown on call)",
    },
  },
  {
    id: "ws-alambagh",
    city_id: "city-lucknow",
    name: "Vrooma Express Service Alambagh",
    address: "Kanpur Road, Alambagh, Lucknow, UP 226005",
    phone: "+91 522 450 3344",
    bays: 8,
    hours: {
      "Mon - Sat": "09:00 AM - 06:30 PM",
      Sunday: "10:00 AM - 03:00 PM",
    },
  },
];

