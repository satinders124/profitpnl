import { trialEndingSoonEmailHtml, trialEndedEmailHtml } from "../lib/email-templates.ts";
import fs from "fs";
fs.writeFileSync("/tmp/trial-reminder.html", trialEndingSoonEmailHtml("Alex"));
fs.writeFileSync("/tmp/trial-ended.html", trialEndedEmailHtml("Alex"));
console.log("written");
