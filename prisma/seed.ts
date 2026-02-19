import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
    console.log("🌱 Seeding database...");

    // Create users
    const users = await Promise.all([
        prisma.user.upsert({
            where: { email: "elon@twitter.com" },
            update: {},
            create: {
                name: "Elon Musk",
                username: "elonmusk",
                email: "elon@twitter.com",
                password: await bcrypt.hash("password123", 12),
                bio: "CEO of SpaceX & Tesla. Owner of X.",
                location: "Texas, USA",
                website: "https://x.com",
                verified: true,
                image: "https://pbs.twimg.com/profile_images/1590968738428895232/IY9Gx6Ok_400x400.jpg",
            },
        }),
        prisma.user.upsert({
            where: { email: "sundar@google.com" },
            update: {},
            create: {
                name: "Sundar Pichai",
                username: "sundarpichai",
                email: "sundar@google.com",
                password: await bcrypt.hash("password123", 12),
                bio: "CEO of Google & Alphabet",
                location: "Mountain View, CA",
                verified: true,
                image: "https://pbs.twimg.com/profile_images/864282616597405701/M-FEJMZ0_400x400.jpg",
            },
        }),
        prisma.user.upsert({
            where: { email: "demo@twitter.com" },
            update: {},
            create: {
                name: "Demo User",
                username: "demouser",
                email: "demo@twitter.com",
                password: await bcrypt.hash("password123", 12),
                bio: "Just a regular person on the internet 🌐",
                location: "Internet",
            },
        }),
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create tweets
    const tweets = await Promise.all([
        prisma.tweet.upsert({
            where: { id: "tweet1" },
            update: {},
            create: {
                id: "tweet1",
                content: "The thing I find most surprising is how quickly transformer models have improved over the last few years. The rate of progress is genuinely shocking.",
                authorId: users[0].id,
            },
        }),
        prisma.tweet.upsert({
            where: { id: "tweet2" },
            update: {},
            create: {
                id: "tweet2",
                content: "Gemini 2.0 is here. Our most capable model yet, with native audio and video understanding. Try it now at gemini.google.com 🚀",
                authorId: users[1].id,
                image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600",
            },
        }),
        prisma.tweet.upsert({
            where: { id: "tweet3" },
            update: {},
            create: {
                id: "tweet3",
                content: "Just joined X. This is my first tweet! Hello world 👋",
                authorId: users[2].id,
            },
        }),
        prisma.tweet.upsert({
            where: { id: "tweet4" },
            update: {},
            create: {
                id: "tweet4",
                content: "The next step for AI is reasoning, not just prediction. Models that can think step-by-step will change everything.",
                authorId: users[0].id,
            },
        }),
        prisma.tweet.upsert({
            where: { id: "tweet5" },
            update: {},
            create: {
                id: "tweet5",
                content: "Excited to announce that Google Search now uses AI to give you better, more comprehensive answers. The future of search is here.",
                authorId: users[1].id,
            },
        }),
    ]);

    console.log(`✅ Created ${tweets.length} tweets`);

    // Create some likes and follows
    await prisma.like.upsert({
        where: { userId_tweetId: { userId: users[2].id, tweetId: "tweet1" } },
        update: {},
        create: { userId: users[2].id, tweetId: "tweet1" },
    });

    await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: users[2].id, followingId: users[0].id } },
        update: {},
        create: { followerId: users[2].id, followingId: users[0].id },
    });

    console.log("✅ Created sample interactions");
    console.log("\n🎉 Seed complete!");
    console.log("\n📧 Demo login:");
    console.log("   Email: demo@twitter.com");
    console.log("   Password: password123");
}

main()
    .catch((e) => {
        console.error("❌ Error seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
