import type { Metadata } from "next";
import BrokerCsvConverterClient from "./BrokerCsvConverterClient";
const title = "Broker CSV Converter — Clean MT5, Tradovate & Trading Journal Exports | ProfitPnL";
const description = "Paste messy broker trade history CSV and convert it into a clean ProfitPnL trading journal CSV format.";
export const metadata: Metadata = { title, description, alternates: { canonical: "/tools/broker-csv-converter" } };
export default function Page() { return <BrokerCsvConverterClient />; }
