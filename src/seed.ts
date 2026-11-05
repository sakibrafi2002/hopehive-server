import { addDays, todayString } from "./dates.js";
import { closeDb, connectDb, events, type EventDoc } from "./db.js";

/**
 * Inserts sample events so the Home and Upcoming Events pages are not empty on a fresh database.
 * Dates are relative to today, so the samples are always upcoming.
 * Run with: npm run seed
 */
const SEED_EMAIL = "team@hopehive.example";
const SEED_NAME = "HopeHive Volunteer Team";

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const samples: Array<Pick<EventDoc, "title" | "description" | "eventType" | "thumbnail" | "location"> & { inDays: number }> = [
  {
    title: "Winter Clothes Distribution",
    description:
      "Join us to hand out warm jackets, sweaters and socks to families who sleep in the open during the coldest weeks of the year. Volunteers sort donated clothes by size at the venue and then distribute them street by street. Bring a friend and a few spare bags if you can.",
    eventType: "Donation",
    thumbnail: "https://plus.unsplash.com/premium_photo-1661964155049-f8a24a60be74?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    location: "Mirpur 10, Dhaka",
    inDays: 7,
  },
  {
    title: "Blanket Distribution for the Needy",
    description:
      "A late evening drive to deliver fresh blankets to rickshaw pullers, street vendors and night workers around Mohammadpur. We meet at the community centre, pack the blankets together and split into small groups so every household gets a warm night.",
    eventType: "Donation",
    thumbnail: photo("photo-1559027615-cd4628902d4a"),
    location: "Mohammadpur, Dhaka",
    inDays: 9,
  },
  {
    title: "Lakeside Cleanup Morning",
    description:
      "Gloves, bags and tea are on us. Spend a morning collecting plastic and litter along the Dhanmondi lake walkway so families can enjoy it again. We will sort recyclables on site and weigh everything to see what the whole team achieved.",
    eventType: "Cleanup",
    thumbnail: photo("photo-1532629345422-7515f3d16bb6"),
    location: "Dhanmondi Lake, Dhaka",
    inDays: 12,
  },
  {
    title: "Community Tree Plantation Day",
    description:
      "Help us plant 300 native saplings along the roadside and school boundary in Uttara. Local gardeners will show you how deep to dig and how to protect young plants. Every volunteer gets a tag to follow the growth of their own tree.",
    eventType: "Plantation",
    thumbnail: "https://images.unsplash.com/photo-1524602585632-a2a01c12307c?q=80&w=907&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    location: "Uttara Sector 7, Dhaka",
    inDays: 15,
  },
  {
    title: "Emergency Blood Donation Camp",
    description:
      "Registered doctors and nurses will run a safe, sterile blood donation camp for patients who need regular transfusions. Please eat well and drink water before you come, and bring a valid ID. First time donors are very welcome.",
    eventType: "Blood Donation",
    thumbnail: "https://images.unsplash.com/photo-1536856136534-bb679c52a9aa?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    location: "Banani Community Hall, Dhaka",
    inDays: 18,
  },
  {
    title: "Free Evening Classes for Street Children",
    description:
      "Volunteer teachers needed for a relaxed two hour session of reading, basic maths and drawing with children who cannot attend regular school. No teaching experience is required, only patience and a friendly smile.",
    eventType: "Education",
    thumbnail: photo("photo-1488521787991-ed7bbaae773c"),
    location: "Farmgate, Dhaka",
    inDays: 21,
  },
  {
    title: "Free Health Check-up Camp",
    description:
      "General physicians will check blood pressure, blood sugar and eyesight for elderly residents who cannot easily reach a clinic. Volunteers are needed for registration, queue support and walking patients to the right desk.",
    eventType: "Health Camp",
    thumbnail: photo("photo-1469571486292-0ba58a3f068b"),
    location: "Mohakhali, Dhaka",
    inDays: 25,
  },
  {
    title: "Hot Meals for Winter Night Workers",
    description:
      "We cook khichuri in the afternoon and serve hot meals to night guards, drivers and cleaners at the end of their shift. Come to help with chopping, packing and serving. Everything is vegetarian and prepared in a clean community kitchen.",
    eventType: "Food Distribution",
    thumbnail: photo("photo-1542810634-71277d95dcbb"),
    location: "Gulshan 1, Dhaka",
    inDays: 28,
  },
];

async function seed() {
  await connectDb();

  const removed = await events.deleteMany({ creatorEmail: SEED_EMAIL });
  const today = todayString();
  const now = new Date();

  const docs: EventDoc[] = samples.map(({ inDays, ...rest }) => ({
    ...rest,
    eventDate: addDays(today, inDays),
    creatorEmail: SEED_EMAIL,
    creatorName: SEED_NAME,
    participantCount: 0,
    createdAt: now,
    updatedAt: now,
  }));

  const result = await events.insertMany(docs);
  console.log(`Removed ${removed.deletedCount} old sample events and added ${result.insertedCount} new ones.`);
}

seed()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
