require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ============================================================
// CONFIG
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const BRAND_COLOUR = "#2F4DA8";
const LOGO = "<:Our_Logo:1557149633623363594>";

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID.");
    process.exit(1);
}

// ============================================================
// CLIENT
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// ============================================================
// DATA
// ============================================================

const dataFolder = path.join(__dirname, "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const configFile = path.join(dataFolder, "config.json");
const warningsFile = path.join(dataFolder, "warnings.json");

function loadJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
            return fallback;
        }

        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
        return fallback;
    }
}

function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let config = loadJSON(configFile, {});
let warnings = loadJSON(warningsFile, {});

const submissions = new Map();

// ============================================================
// HELPERS
// ============================================================

function guildConfig(guildId) {
    if (!config[guildId]) config[guildId] = {};
    return config[guildId];
}

function embed(title, description) {
    return new EmbedBuilder()
        .setColor(BRAND_COLOUR)
        .setTitle(`${LOGO} ${title}`)
        .setDescription(description || null)
        .setTimestamp();
}

function canManage(member) {
    return member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        member.permissions.has(PermissionFlagsBits.Administrator);
}

function isStaff(member, type = "staff") {
    if (!member) return false;

    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    const cfg = guildConfig(member.guild.id);

    const roleId =
        type === "submit"
            ? cfg.submitStaffRoleId
            : type === "ticket"
                ? cfg.ticketStaffRoleId
                : cfg.staffRoleId;

    return roleId ? member.roles.cache.has(roleId) : false;
}

function safeName(name, fallback = "user") {
    const result = name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 70);

    return result || fallback;
}

async function getOrCreateWebhook(channel, name) {
    const hooks = await channel.fetchWebhooks();

    let webhook = hooks.find(
        hook => hook.owner?.id === client.user.id
    );

    if (!webhook) {
        webhook = await channel.createWebhook({
            name
        });
    }

    return webhook;
}

// ============================================================
// COMMANDS
// ============================================================

const commands = [

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows available commands"),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Checks bot latency"),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("Shows bot information"),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Shows server information"),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Shows user information")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("User")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Shows your profile"),

    // MODERATION

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("minutes")
                .setDescription("Minutes")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a timeout")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View warnings")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear warnings")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete messages")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Amount")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    // MANAGEMENT

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the current channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the current channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set channel slowmode")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(o =>
            o.setName("seconds")
                .setDescription("Seconds")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage roles")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(s =>
            s.setName("add")
                .setDescription("Add a role")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role")
                        .setDescription("Role")
                        .setRequired(true)
                )
        )
        .addSubcommand(s =>
            s.setName("remove")
                .setDescription("Remove a role")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role")
                        .setDescription("Role")
                        .setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Send an announcement")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o =>
            o.setName("message")
                .setDescription("Announcement")
                .setRequired(true)
        ),

    // WEBHOOK EMBED

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Open the webhook embed builder")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    // TICKETS

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription("Configure tickets")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // REPORTS

    new SlashCommandBuilder()
        .setName("reportsetup")
        .setDescription("Configure server reports")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // SUBMISSIONS

    new SlashCommandBuilder()
        .setName("submitconfig")
        .setDescription("Configure server submissions")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // VERIFICATION

    new SlashCommandBuilder()
        .setName("verification")
        .setDescription("Configure verification")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

].map(c => c.toJSON());

// ============================================================
// COMMAND REGISTRATION
// ============================================================

async function registerCommands() {
    try {
        const rest = new REST({ version: "10" }).setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            { body: commands }
        );

        console.log(`Registered ${commands.length} commands.`);
    } catch (error) {
        console.error("Command registration error:", error);
    }
}

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} server(s).`);

    await registerCommands();

    client.user.setActivity("server listings", {
        type: 3
    });
});

// ============================================================
// WELCOMER
// ============================================================

client.on("guildMemberAdd", async member => {
    try {
        const cfg = guildConfig(member.guild.id);

        if (!cfg.welcomeChannelId) return;

        const channel =
            member.guild.channels.cache.get(
                cfg.welcomeChannelId
            );

        if (!channel) return;

        const message =
            cfg.welcomeMessage ||
            `Welcome to **${member.guild.name}**, ${member}!`;

        const finalMessage = message
            .replace(/{user}/g, member.toString())
            .replace(/{username}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{membercount}/g, member.guild.memberCount.toString());

        // No thumbnail / PFP.
        await channel.send({
            embeds: [
                embed("Welcome!", finalMessage)
            ]
        });
    } catch (error) {
        console.error("Welcome error:", error);
    }
});

// ============================================================
// INTERACTIONS
// ============================================================

client.on("interactionCreate", async interaction => {

    try {

        // ======================================================
        // SLASH COMMANDS
        // ======================================================

        if (interaction.isChatInputCommand()) {

            const command = interaction.commandName;

            if (command === "help") {
                return interaction.reply({
                    embeds: [
                        embed(
                            "Commands",
                            "**General**\n" +
                            "`/help` `/ping` `/botinfo` `/serverinfo` `/userinfo` `/profile`\n\n" +

                            "**Moderation**\n" +
                            "`/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings` `/purge`\n\n" +

                            "**Management**\n" +
                            "`/lock` `/unlock` `/slowmode` `/role` `/announce` `/embed`\n\n" +

                            "**Systems**\n" +
                            "`/ticketconfig` `/reportsetup` `/submitconfig` `/verification`"
                        )
                    ],
                    ephemeral: true
                });
            }

            if (command === "ping") {
                return interaction.reply({
                    content: `Pong! ${client.ws.ping}ms`,
                    ephemeral: true
                });
            }

            if (command === "botinfo") {
                return interaction.reply({
                    embeds: [
                        embed(
                            "Bot Information",
                            `**Bot:** ${client.user.tag}\n` +
                            `**Servers:** ${client.guilds.cache.size}\n` +
                            `**Discord.js:** v14`
                        )
                    ]
                });
            }

            if (command === "serverinfo") {
                const g = interaction.guild;

                return interaction.reply({
                    embeds: [
                        embed(
                            g.name,
                            `**Owner:** <@${g.ownerId}>\n` +
                            `**Members:** ${g.memberCount}\n` +
                            `**Channels:** ${g.channels.cache.size}\n` +
                            `**Roles:** ${g.roles.cache.size}`
                        )
                    ]
                });
            }

            if (command === "userinfo") {
                const user =
                    interaction.options.getUser("user") ||
                    interaction.user;

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                const e = embed(
                    "User Information",
                    `**Username:** ${user.tag}\n` +
                    `**ID:** ${user.id}\n` +
                    `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>`
                );

                if (member?.joinedTimestamp) {
                    e.addFields({
                        name: "Joined",
                        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                    });
                }

                return interaction.reply({
                    embeds: [e]
                });
            }

            if (command === "profile") {
                const member = interaction.member;

                return interaction.reply({
                    embeds: [
                        embed(
                            `${interaction.user.username}'s Profile`,
                            `**Username:** ${interaction.user.tag}\n` +
                            `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n\n` +
                            `**Roles:** ${
                                member.roles.cache
                                    .filter(r => r.id !== interaction.guild.id)
                                    .map(r => r.toString())
                                    .join(", ") || "None"
                            }`
                        )
                    ]
                });
            }

            // ==================================================
            // MODERATION
            // ==================================================

            if (command === "ban") {
                const user = interaction.options.getUser("user");
                const reason =
                    interaction.options.getString("reason") ||
                    "No reason provided";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member)
                    return interaction.reply({
                        content: "Member not found.",
                        ephemeral: true
                    });

                await member.ban({ reason });

                return interaction.reply(
                    `Banned **${user.tag}**.\nReason: ${reason}`
                );
            }

            if (command === "kick") {
                const user = interaction.options.getUser("user");
                const reason =
                    interaction.options.getString("reason") ||
                    "No reason provided";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member)
                    return interaction.reply({
                        content: "Member not found.",
                        ephemeral: true
                    });

                await member.kick(reason);

                return interaction.reply(
                    `Kicked **${user.tag}**.\nReason: ${reason}`
                );
            }

            if (command === "timeout") {
                const user = interaction.options.getUser("user");
                const minutes =
                    interaction.options.getInteger("minutes");

                const reason =
                    interaction.options.getString("reason") ||
                    "No reason provided";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member)
                    return interaction.reply({
                        content: "Member not found.",
                        ephemeral: true
                    });

                await member.timeout(
                    minutes * 60 * 1000,
                    reason
                );

                return interaction.reply(
                    `Timed out **${user.tag}** for ${minutes} minute(s).`
                );
            }

            if (command === "untimeout") {
                const user =
                    interaction.options.getUser("user");

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member)
                    return interaction.reply({
                        content: "Member not found.",
                        ephemeral: true
                    });

                await member.timeout(null);

                return interaction.reply(
                    `Removed timeout from **${user.tag}**.`
                );
            }

            if (command === "warn") {
                const user =
                    interaction.options.getUser("user");

                const reason =
                    interaction.options.getString("reason");

                if (!warnings[interaction.guild.id])
                    warnings[interaction.guild.id] = {};

                if (!warnings[interaction.guild.id][user.id])
                    warnings[interaction.guild.id][user.id] = [];

                warnings[interaction.guild.id][user.id].push({
                    reason,
                    moderator: interaction.user.id,
                    timestamp: Date.now()
                });

                saveJSON(warningsFile, warnings);

                return interaction.reply(
                    `Warned **${user.tag}**.\nReason: ${reason}`
                );
            }

            if (command === "warnings") {
                const user =
                    interaction.options.getUser("user") ||
                    interaction.user;

                const list =
                    warnings[interaction.guild.id]?.[user.id] || [];

                if (!list.length)
                    return interaction.reply({
                        content: `**${user.tag}** has no warnings.`,
                        ephemeral: true
                    });

                return interaction.reply({
                    embeds: [
                        embed(
                            `Warnings — ${user.tag}`,
                            list.map(
                                (w, i) =>
                                    `**${i + 1}.** ${w.reason} — <@${w.moderator}>`
                            ).join("\n")
                        )
                    ]
                });
            }

            if (command === "clearwarnings") {
                const user =
                    interaction.options.getUser("user");

                if (warnings[interaction.guild.id])
                    delete warnings[interaction.guild.id][user.id];

                saveJSON(warningsFile, warnings);

                return interaction.reply(
                    `Cleared warnings for **${user.tag}**.`
                );
            }

            if (command === "purge") {
                const amount =
                    interaction.options.getInteger("amount");

                await interaction.channel.bulkDelete(
                    amount,
                    true
                );

                return interaction.reply({
                    content: `Deleted ${amount} message(s).`,
                    ephemeral: true
                });
            }

            // ==================================================
            // CHANNEL MANAGEMENT
            // ==================================================

            if (command === "lock") {
                await interaction.channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    { SendMessages: false }
                );

                return interaction.reply("Channel locked.");
            }

            if (command === "unlock") {
                await interaction.channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    { SendMessages: null }
                );

                return interaction.reply("Channel unlocked.");
            }

            if (command === "slowmode") {
                const seconds =
                    interaction.options.getInteger("seconds");

                await interaction.channel.setRateLimitPerUser(
                    seconds
                );

                return interaction.reply(
                    seconds === 0
                        ? "Slowmode disabled."
                        : `Slowmode set to ${seconds} seconds.`
                );
            }

            if (command === "role") {
                const sub =
                    interaction.options.getSubcommand();

                const member =
                    interaction.options.getMember("user");

                const role =
                    interaction.options.getRole("role");

                if (
                    role.position >=
                    interaction.member.roles.highest.position
                ) {
                    return interaction.reply({
                        content: "You cannot manage that role.",
                        ephemeral: true
                    });
                }

                if (sub === "add")
                    await member.roles.add(role);
                else
                    await member.roles.remove(role);

                return interaction.reply(
                    `${sub === "add" ? "Added" : "Removed"} ${role} ${
                        sub === "add" ? "to" : "from"
                    } **${member.user.tag}**.`
                );
            }

            if (command === "announce") {
                const message =
                    interaction.options.getString("message");

                return interaction.reply({
                    embeds: [
                        embed("Announcement", message).setFooter({
                            text: `Posted by ${interaction.user.tag}`
                        })
                    ]
                });
            }

            // ==================================================
            // EMBED BUILDER
            // ==================================================

            if (command === "embed") {
                return interaction.reply({
                    embeds: [
                        embed(
                            "Webhook Embed Builder",
                            "Create a professional webhook embed using the controls below."
                        )
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("embed_create")
                                .setLabel("Create Embed")
                                .setStyle(ButtonStyle.Primary),

                            new ButtonBuilder()
                                .setCustomId("embed_webhook_name")
                                .setLabel("Webhook Name")
                                .setStyle(ButtonStyle.Secondary),

                            new ButtonBuilder()
                                .setCustomId("embed_refresh")
                                .setLabel("Refresh")
                                .setStyle(ButtonStyle.Secondary)
                        )
                    ],
                    ephemeral: true
                });
            }

            // ==================================================
            // TICKET CONFIG
            // ==================================================

            if (command === "ticketconfig") {
                if (!canManage(interaction.member))
                    return interaction.reply({
                        content: "You need Manage Server.",
                        ephemeral: true
                    });

                return sendTicketPanel(interaction);
            }

            // ==================================================
            // REPORT SETUP
            // ==================================================

            if (command === "reportsetup") {
                if (!canManage(interaction.member))
                    return interaction.reply({
                        content: "You need Manage Server.",
                        ephemeral: true
                    });

                return sendReportPanel(interaction);
            }

            // ==================================================
            // SUBMIT CONFIG
            // ==================================================

            if (command === "submitconfig") {
                if (!canManage(interaction.member))
                    return interaction.reply({
                        content: "You need Manage Server.",
                        ephemeral: true
                    });

                return sendSubmitPanel(interaction);
            }

            // ==================================================
            // VERIFICATION
            // ==================================================

            if (command === "verification") {
                if (!canManage(interaction.member))
                    return interaction.reply({
                        content: "You need Manage Server.",
                        ephemeral: true
                    });

                return sendVerificationPanel(interaction);
            }
        }

        // ======================================================
        // BUTTONS
        // ======================================================

        if (interaction.isButton()) {

            // ==================================================
            // OPEN TICKET
            // ==================================================

            if (interaction.customId === "open_ticket") {
                const cfg = guildConfig(interaction.guild.id);

                if (!cfg.ticketStaffRoleId)
                    return interaction.reply({
                        content: "Tickets have not been configured.",
                        ephemeral: true
                    });

                const existing =
                    interaction.guild.channels.cache.find(
                        c =>
                            c.topic ===
                            `ticket-owner:${interaction.user.id}`
                    );

                if (existing)
                    return interaction.reply({
                        content: `You already have a ticket: ${existing}`,
                        ephemeral: true
                    });

                const staffRole =
                    interaction.guild.roles.cache.get(
                        cfg.ticketStaffRoleId
                    );

                const channel =
                    await interaction.guild.channels.create({
                        name: `ticket-${safeName(interaction.user.username)}`,
                        type: ChannelType.GuildText,
                        parent: cfg.ticketCategoryId || undefined,
                        topic: `ticket-owner:${interaction.user.id}`,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            },
                            {
                                id: interaction.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: staffRole.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: client.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.ManageChannels
                                ]
                            }
                        ]
                    });

                const buttons =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("claim_ticket")
                            .setLabel("Claim")
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId("close_ticket")
                            .setLabel("Close")
                            .setStyle(ButtonStyle.Danger)
                    );

                await channel.send({
                    content: `${staffRole} ${interaction.user}`,
                    embeds: [
                        embed(
                            "Support Ticket",
                            `Welcome ${interaction.user}!\n\nPlease explain what you need help with.`
                        )
                    ],
                    components: [buttons]
                });

                return interaction.reply({
                    content: `Your ticket has been created: ${channel}`,
                    ephemeral: true
                });
            }

            // ==================================================
            // OPEN REPORT
            // ==================================================

            if (interaction.customId === "open_report") {
                const cfg = guildConfig(interaction.guild.id);

                if (!cfg.reportStaffRoleId)
                    return interaction.reply({
                        content: "Server reports have not been configured.",
                        ephemeral: true
                    });

                const modal =
                    new ModalBuilder()
                        .setCustomId("server_report_modal")
                        .setTitle("Report a Server");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("reported_server")
                            .setLabel("Server Name")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("report_reason")
                            .setLabel("Reason for Report")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("report_evidence")
                            .setLabel("Evidence / Details")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                    )
                );

                return interaction.showModal(modal);
            }

            // ==================================================
            // SUBMIT SERVER
            // ==================================================

            if (interaction.customId === "submit_server") {
                const cfg = guildConfig(interaction.guild.id);

                if (!cfg.submitStaffRoleId)
                    return interaction.reply({
                        content: "Server submissions have not been configured.",
                        ephemeral: true
                    });

                const modal =
                    new ModalBuilder()
                        .setCustomId("server_submission_modal")
                        .setTitle("Submit Your Server");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_name")
                            .setLabel("Server Name")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_description")
                            .setLabel("Server Description")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_invite")
                            .setLabel("Discord Invite")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_category")
                            .setLabel("Category")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_owner")
                            .setLabel("Your Role")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

                return interaction.showModal(modal);
            }

            // ==================================================
            // CLAIM
            // ==================================================

            if (interaction.customId === "claim_ticket") {
                if (!isStaff(interaction.member, "ticket"))
                    return interaction.reply({
                        content: "Only ticket staff can claim tickets.",
                        ephemeral: true
                    });

                return interaction.reply({
                    embeds: [
                        embed(
                            "Ticket Claimed",
                            `${interaction.user} has claimed this ticket.`
                        )
                    ]
                });
            }

            // ==================================================
            // CLOSE
            // ==================================================

            if (interaction.customId === "close_ticket") {
                if (!isStaff(interaction.member, "ticket"))
                    return interaction.reply({
                        content: "Only ticket staff can close tickets.",
                        ephemeral: true
                    });

                const cfg = guildConfig(interaction.guild.id);

                if (cfg.ticketLogsChannelId) {
                    const logChannel =
                        interaction.guild.channels.cache.get(
                            cfg.ticketLogsChannelId
                        );

                    if (logChannel) {
                        await logChannel.send({
                            embeds: [
                                embed(
                                    "Ticket Closed",
                                    `**Channel:** ${interaction.channel.name}\n` +
                                    `**Closed by:** ${interaction.user}\n` +
                                    `**Opened by:** <@${interaction.channel.topic?.split(":")[1] || "Unknown"}>`
                                )
                            ]
                        });
                    }
                }

                await interaction.reply({
                    embeds: [
                        embed(
                            "Ticket Closed",
                            `Closed by ${interaction.user}.\n\nDeleting this channel in 5 seconds.`
                        )
                    ]
                });

                setTimeout(
                    () => interaction.channel.delete().catch(() => {}),
                    5000
                );

                return;
            }

            // ==================================================
            // EMBED CREATE
            // ==================================================

            if (interaction.customId === "embed_create") {
                const modal =
                    new ModalBuilder()
                        .setCustomId("embed_modal")
                        .setTitle("Create Webhook Embed");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("embed_title")
                            .setLabel("Title")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("embed_description")
                            .setLabel("Description")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("embed_button")
                            .setLabel("Button Name")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                            .setPlaceholder("Join Server!")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("embed_url")
                            .setLabel("Button URL")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                    )
                );

                return interaction.showModal(modal);
            }

            // ==================================================
            // WEBHOOK NAME
            // ==================================================

            if (interaction.customId === "embed_webhook_name") {
                const modal =
                    new ModalBuilder()
                        .setCustomId("webhook_name_modal")
                        .setTitle("Webhook Name");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("webhook_name")
                            .setLabel("Webhook Name")
                            .setStyle(TextInputStyle.Short)
                            .setMaxLength(80)
                            .setRequired(true)
                    )
                );

                return interaction.showModal(modal);
            }

            // ==================================================
            // SUBMISSION ACCEPT
            // ==================================================

            if (interaction.customId.startsWith("submission_accept_")) {

                if (!isStaff(interaction.member, "submit"))
                    return interaction.reply({
                        content: "Only submission staff can approve submissions.",
                        ephemeral: true
                    });

                const id =
                    interaction.customId.replace(
                        "submission_accept_",
                        ""
                    );

                const submission = submissions.get(id);

                if (!submission)
                    return interaction.reply({
                        content: "This submission is no longer available.",
                        ephemeral: true
                    });

                await interaction.deferReply({ ephemeral: true });

                const cfg = guildConfig(interaction.guild.id);

                const listingChannel =
                    interaction.guild.channels.cache.get(
                        cfg.verifiedChannelId
                    );

                if (!listingChannel) {
                    return interaction.editReply(
                        "The verified server channel is not configured."
                    );
                }

                // VERIFIED ROLE

                if (cfg.verifiedRoleId) {
                    const role =
                        interaction.guild.roles.cache.get(
                            cfg.verifiedRoleId
                        );

                    const member =
                        await interaction.guild.members
                            .fetch(submission.userId)
                            .catch(() => null);

                    if (role && member)
                        await member.roles.add(role).catch(() => {});
                }

                // WEBHOOK

                const webhook =
                    await getOrCreateWebhook(
                        listingChannel,
                        "Verified Servers"
                    );

                const listing =
                    new EmbedBuilder()
                        .setColor(BRAND_COLOUR)
                        .setTitle(
                            `${LOGO} ${submission.serverName}`
                        )
                        .setDescription(
                            submission.description
                        )
                        .addFields(
                            {
                                name: "Category",
                                value: submission.category || "Not specified",
                                inline: true
                            },
                            {
                                name: "Server Owner",
                                value: `<@${submission.userId}>`,
                                inline: true
                            }
                        )
                        .setFooter({
                            text: "Verified Server"
                        })
                        .setTimestamp();

                // IMPORTANT:
                // Invite is ONLY used for the button.
                // It is NOT displayed inside the embed.

                const joinButton =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel("Join Server!")
                            .setStyle(ButtonStyle.Link)
                            .setURL(submission.invite)
                    );

                await webhook.send({
                    username: submission.serverName,
                    avatarURL: client.user.displayAvatarURL(),
                    embeds: [listing],
                    components: [joinButton]
                });

                // DM

                const applicant =
                    await client.users
                        .fetch(submission.userId)
                        .catch(() => null);

                if (applicant) {
                    await applicant.send({
                        embeds: [
                            embed(
                                "Server Approved",
                                `Your server **${submission.serverName}** has been approved and added to our verified server listings.`
                            )
                        ]
                    }).catch(() => {});
                }

                submissions.delete(id);

                await interaction.message.edit({
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("approved")
                                .setLabel("Approved")
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true)
                        )
                    ]
                });

                // CLOSE REVIEW CHANNEL

                const reviewChannel = interaction.channel;

                await interaction.editReply(
                    "Server approved and listed. Closing the review channel..."
                );

                setTimeout(
                    () => reviewChannel.delete().catch(() => {}),
                    3000
                );

                return;
            }

            // ==================================================
            // SUBMISSION DENY
            // ==================================================

            if (interaction.customId.startsWith("submission_deny_")) {

                if (!isStaff(interaction.member, "submit"))
                    return interaction.reply({
                        content: "Only submission staff can deny submissions.",
                        ephemeral: true
                    });

                const id =
                    interaction.customId.replace(
                        "submission_deny_",
                        ""
                    );

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            `submission_deny_modal_${id}`
                        )
                        .setTitle("Deny Submission");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("deny_reason")
                            .setLabel("Reason")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setMaxLength(1000)
                    )
                );

                return interaction.showModal(modal);
            }

            // ==================================================
            // CONFIG BUTTONS
            // ==================================================

            if (interaction.customId === "ticket_set_staff") {
                return selectRole(
                    interaction,
                    "ticket_staff_select",
                    "Select the ticket staff role."
                );
            }

            if (interaction.customId === "ticket_set_category") {
                return selectCategory(
                    interaction,
                    "ticket_category_select",
                    "Select the ticket category."
                );
            }

            if (interaction.customId === "ticket_set_logs") {
                return selectChannel(
                    interaction,
                    "ticket_logs_select",
                    "Select the ticket logs channel."
                );
            }

            if (interaction.customId === "ticket_send_panel") {
                const row =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("open_ticket")
                            .setLabel("Open Ticket")
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.channel.send({
                    embeds: [
                        embed(
                            "Support Tickets",
                            "Need help? Open a ticket below and a member of staff will assist you."
                        )
                    ],
                    components: [row]
                });

                return interaction.reply({
                    content: "Ticket panel sent.",
                    ephemeral: true
                });
            }

            if (interaction.customId === "report_set_staff") {
                return selectRole(
                    interaction,
                    "report_staff_select",
                    "Select the report staff role."
                );
            }

            if (interaction.customId === "report_set_category") {
                return selectCategory(
                    interaction,
                    "report_category_select",
                    "Select the category for server reports."
                );
            }

            if (interaction.customId === "report_send_panel") {
                await interaction.channel.send({
                    embeds: [
                        embed(
                            "Report a Server",
                            "If you believe a listed server breaks our rules, use the button below to submit a report."
                        )
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("open_report")
                                .setLabel("Report Server")
                                .setStyle(ButtonStyle.Danger)
                        )
                    ]
                });

                return interaction.reply({
                    content: "Report panel sent.",
                    ephemeral: true
                });
            }

            if (interaction.customId === "submit_set_staff") {
                return selectRole(
                    interaction,
                    "submit_staff_select",
                    "Select the submission staff role."
                );
            }

            if (interaction.customId === "submit_set_review") {
                return selectCategory(
                    interaction,
                    "submit_review_select",
                    "Select the review category."
                );
            }

            if (interaction.customId === "submit_set_verified") {
                return selectChannel(
                    interaction,
                    "submit_verified_select",
                    "Select the verified server channel."
                );
            }

            if (interaction.customId === "submit_set_verified_role") {
                return selectRole(
                    interaction,
                    "submit_verified_role_select",
                    "Select the verified role."
                );
            }

            if (interaction.customId === "submit_send_panel") {
                await interaction.channel.send({
                    embeds: [
                        embed(
                            "Submit Your Server",
                            "Want your server featured in our verified server listings?\n\nSubmit it below for manual review by our staff team."
                        )
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("submit_server")
                                .setLabel("Submit Server")
                                .setStyle(ButtonStyle.Primary)
                        )
                    ]
                });

                return interaction.reply({
                    content: "Submission panel sent.",
                    ephemeral: true
                });
            }

            if (interaction.customId === "verification_set_role") {
                return selectRole(
                    interaction,
                    "verification_role_select",
                    "Select the verification role."
                );
            }

            if (interaction.customId === "verification_set_channel") {
                return selectChannel(
                    interaction,
                    "verification_channel_select",
                    "Select the verification channel."
                );
            }

            if (interaction.customId === "verification_send_panel") {

                await interaction.channel.send({
                    embeds: [
                        embed(
                            "Server Verification",
                            "Click the button below to receive the verified member role."
                        )
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("verify_member")
                                .setLabel("Verify")
                                .setStyle(ButtonStyle.Success)
                        )
                    ]
                });

                return interaction.reply({
                    content: "Verification panel sent.",
                    ephemeral: true
                });
            }

            if (interaction.customId === "verify_member") {
                const cfg = guildConfig(interaction.guild.id);

                if (!cfg.verificationRoleId)
                    return interaction.reply({
                        content: "Verification has not been configured.",
                        ephemeral: true
                    });

                const role =
                    interaction.guild.roles.cache.get(
                        cfg.verificationRoleId
                    );

                if (!role)
                    return interaction.reply({
                        content: "The configured verification role no longer exists.",
                        ephemeral: true
                    });

                await interaction.member.roles.add(role);

                return interaction.reply({
                    content: `You have been verified and received ${role}.`,
                    ephemeral: true
                });
            }

            if (interaction.customId === "ticket_refresh") {
                return sendTicketPanel(interaction, true);
            }

            if (interaction.customId === "submit_refresh") {
                return sendSubmitPanel(interaction, true);
            }
        }

        // ======================================================
        // SELECT MENUS
        // ======================================================

        if (interaction.isStringSelectMenu()) {

            const cfg = guildConfig(interaction.guild.id);
            const value = interaction.values[0];

            if (interaction.customId === "ticket_staff_select") {
                cfg.ticketStaffRoleId = value;
            }

            if (interaction.customId === "ticket_category_select") {
                cfg.ticketCategoryId = value;
            }

            if (interaction.customId === "ticket_logs_select") {
                cfg.ticketLogsChannelId = value;
            }

            if (interaction.customId === "report_staff_select") {
                cfg.reportStaffRoleId = value;
            }

            if (interaction.customId === "report_category_select") {
                cfg.reportCategoryId = value;
            }

            if (interaction.customId === "submit_staff_select") {
                cfg.submitStaffRoleId = value;
                cfg.staffRoleId = cfg.staffRoleId || value;
            }

            if (interaction.customId === "submit_review_select") {
                cfg.submitReviewCategoryId = value;
            }

            if (interaction.customId === "submit_verified_select") {
                cfg.verifiedChannelId = value;
            }

            if (interaction.customId === "submit_verified_role_select") {
                cfg.verifiedRoleId = value;
            }

            if (interaction.customId === "verification_role_select") {
                cfg.verificationRoleId = value;
            }

            if (interaction.customId === "verification_channel_select") {
                cfg.verificationChannelId = value;
            }

            saveJSON(configFile, config);

            return interaction.update({
                content: "Configuration updated successfully.",
                components: []
            });
        }

        // ======================================================
        // MODALS
        // ======================================================

        if (interaction.isModalSubmit()) {

            // ==================================================
            // EMBED MODAL
            // ==================================================

            if (interaction.customId === "embed_modal") {

                const title =
                    interaction.fields.getTextInputValue("embed_title");

                const description =
                    interaction.fields.getTextInputValue("embed_description");

                const buttonName =
                    interaction.fields.getTextInputValue("embed_button") ||
                    "";

                const buttonURL =
                    interaction.fields.getTextInputValue("embed_url") ||
                    "";

                const cfg = guildConfig(interaction.guild.id);

                cfg.embedTitle = title;
                cfg.embedDescription = description;
                cfg.embedButtonName = buttonName;
                cfg.embedButtonURL = buttonURL;

                saveJSON(configFile, config);

                const components = [];

                if (buttonName && buttonURL) {
                    components.push(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setLabel(buttonName)
                                .setStyle(ButtonStyle.Link)
                                .setURL(buttonURL)
                        )
                    );
                }

                return interaction.reply({
                    embeds: [
                        embed(title, description)
                    ],
                    components,
                    content: "Preview ready. Press **Send** below to send this webhook embed.",
                    ephemeral: true
                }).then(async () => {

                    await interaction.editReply({
                        components: [
                            ...components,
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId("embed_send")
                                    .setLabel("Send")
                                    .setStyle(ButtonStyle.Success)
                            )
                        ]
                    });
                });
            }

            // ==================================================
            // WEBHOOK NAME
            // ==================================================

            if (interaction.customId === "webhook_name_modal") {

                const name =
                    interaction.fields.getTextInputValue("webhook_name");

                const cfg = guildConfig(interaction.guild.id);
                cfg.webhookName = name;

                saveJSON(configFile, config);

                return interaction.reply({
                    content: `Webhook name saved as **${name}**.`,
                    ephemeral: true
                });
            }

            // ==================================================
            // SERVER SUBMISSION
            // ==================================================

            if (interaction.customId === "server_submission_modal") {

                const serverName =
                    interaction.fields.getTextInputValue("server_name");

                const description =
                    interaction.fields.getTextInputValue("server_description");

                const invite =
                    interaction.fields.getTextInputValue("server_invite");

                const category =
                    interaction.fields.getTextInputValue("server_category");

                const owner =
                    interaction.fields.getTextInputValue("server_owner");

                const cfg = guildConfig(interaction.guild.id);

                const id =
                    `${interaction.user.id}-${Date.now()}`;

                submissions.set(id, {
                    userId: interaction.user.id,
                    serverName,
                    description,
                    invite,
                    category,
                    owner,
                    createdAt: Date.now()
                });

                const staffRole =
                    interaction.guild.roles.cache.get(
                        cfg.submitStaffRoleId
                    );

                const reviewCategory =
                    interaction.guild.channels.cache.get(
                        cfg.submitReviewCategoryId
                    );

                if (!staffRole)
                    return interaction.reply({
                        content: "Submission staff role is not configured.",
                        ephemeral: true
                    });

                const channel =
                    await interaction.guild.channels.create({
                        name: `review-${safeName(serverName)}`,
                        type: ChannelType.GuildText,
                        parent: reviewCategory || undefined,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            },
                            {
                                id: staffRole.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: client.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.ManageChannels
                                ]
                            }
                        ]
                    });

                const buttons =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`submission_accept_${id}`)
                            .setLabel("Accept")
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId(`submission_deny_${id}`)
                            .setLabel("Deny")
                            .setStyle(ButtonStyle.Danger)
                    );

                await channel.send({
                    content: `${staffRole} — new server submission.`,
                    embeds: [
                        embed(
                            "New Server Submission",
                            `**Submitted by:** <@${interaction.user.id}>`
                        ).addFields(
                            {
                                name: "Server Name",
                                value: serverName
                            },
                            {
                                name: "Description",
                                value: description
                            },
                            {
                                name: "Invite",
                                value: invite
                            },
                            {
                                name: "Category",
                                value: category
                            },
                            {
                                name: "Submitter's Role",
                                value: owner
                            }
                        )
                    ],
                    components: [buttons]
                });

                return interaction.reply({
                    embeds: [
                        embed(
                            "Submission Received",
                            "Your server has been submitted successfully.\n\nOur staff team will manually review it and you will receive a DM when a decision is made."
                        )
                    ],
                    ephemeral: true
                });
            }

            // ==================================================
            // DENIAL
            // ==================================================

            if (
                interaction.customId.startsWith(
                    "submission_deny_modal_"
                )
            ) {

                const id =
                    interaction.customId.replace(
                        "submission_deny_modal_",
                        ""
                    );

                const submission =
                    submissions.get(id);

                if (!submission)
                    return interaction.reply({
                        content: "Submission no longer exists.",
                        ephemeral: true
                    });

                const reason =
                    interaction.fields.getTextInputValue(
                        "deny_reason"
                    );

                const user =
                    await client.users
                        .fetch(submission.userId)
                        .catch(() => null);

                if (user) {
                    await user.send({
                        embeds: [
                            embed(
                                "Server Submission Denied",
                                `Your server **${submission.serverName}** was not approved.\n\n**Reason:** ${reason}`
                            )
                        ]
                    }).catch(() => {});
                }

                submissions.delete(id);

                await interaction.reply({
                    embeds: [
                        embed(
                            "Submission Denied",
                            `Denied by ${interaction.user}.\n\n**Reason:** ${reason}\n\nThis review channel will now close.`
                        )
                    ]
                });

                setTimeout(
                    () => interaction.channel.delete().catch(() => {}),
                    3000
                );

                return;
            }

            // ==================================================
            // SERVER REPORT
            // ==================================================

            if (interaction.customId === "server_report_modal") {

                const cfg = guildConfig(interaction.guild.id);

                const server =
                    interaction.fields.getTextInputValue(
                        "reported_server"
                    );

                const reason =
                    interaction.fields.getTextInputValue(
                        "report_reason"
                    );

                const evidence =
                    interaction.fields.getTextInputValue(
                        "report_evidence"
                    ) || "None provided";

                const staffRole =
                    interaction.guild.roles.cache.get(
                        cfg.reportStaffRoleId
                    );

                if (!staffRole)
                    return interaction.reply({
                        content: "Report staff role is not configured.",
                        ephemeral: true
                    });

                const category =
                    interaction.guild.channels.cache.get(
                        cfg.reportCategoryId
                    );

                const channel =
                    await interaction.guild.channels.create({
                        name: `server-reports-${safeName(interaction.user.username)}`,
                        type: ChannelType.GuildText,
                        parent: category || undefined,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            },
                            {
                                id: staffRole.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: client.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.ManageChannels
                                ]
                            }
                        ]
                    });

                await channel.send({
                    content: `${staffRole} — new server report.`,
                    embeds: [
                        embed(
                            "Server Report",
                            `**Reported Server:** ${server}\n\n` +
                            `**Reported by:** ${interaction.user}\n\n` +
                            `**Reason:** ${reason}\n\n` +
                            `**Evidence:** ${evidence}`
                        )
                    ]
                });

                return interaction.reply({
                    content: `Your report has been submitted: ${channel}`,
                    ephemeral: true
                });
            }
        }

    } catch (error) {
        console.error("Interaction error:", error);

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "Something went wrong.",
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: "Something went wrong.",
                    ephemeral: true
                });
            }
        } catch {}
    }
});

// ============================================================
// EMBED SEND BUTTON
// ============================================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isButton()) return;

    if (interaction.customId !== "embed_send") return;

    const cfg = guildConfig(interaction.guild.id);

    const title = cfg.embedTitle;
    const description = cfg.embedDescription;

    if (!title || !description) {
        return interaction.reply({
            content: "Create an embed first.",
            ephemeral: true
        });
    }

    const channel = interaction.channel;

    const webhook =
        await getOrCreateWebhook(
            channel,
            cfg.webhookName || "Server Listings"
        );

    const e =
        new EmbedBuilder()
            .setColor(BRAND_COLOUR)
            .setTitle(`${LOGO} ${title}`)
            .setDescription(description)
            .setTimestamp();

    const components = [];

    if (
        cfg.embedButtonName &&
        cfg.embedButtonURL
    ) {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(cfg.embedButtonName)
                    .setStyle(ButtonStyle.Link)
                    .setURL(cfg.embedButtonURL)
            )
        );
    }

    await webhook.send({
        username:
            cfg.webhookName ||
            "Server Listings",
        avatarURL:
            client.user.displayAvatarURL(),
        embeds: [e],
        components
    });

    return interaction.reply({
        content: "Webhook embed sent successfully.",
        ephemeral: true
    });
});

// ============================================================
// CONFIG PANEL HELPERS
// ============================================================

async function selectRole(interaction, id, text) {

    const roles =
        interaction.guild.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .first(25);

    if (!roles.length)
        return interaction.reply({
            content: "No roles available.",
            ephemeral: true
        });

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder("Select a role")
            .addOptions(
                roles.map(r => ({
                    label: r.name.substring(0, 100),
                    value: r.id
                }))
            );

    return interaction.reply({
        content: text,
        components: [
            new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
    });
}

async function selectCategory(interaction, id, text) {

    const categories =
        interaction.guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .first(25);

    if (!categories.length)
        return interaction.reply({
            content: "No categories available.",
            ephemeral: true
        });

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder("Select a category")
            .addOptions(
                categories.map(c => ({
                    label: c.name.substring(0, 100),
                    value: c.id
                }))
            );

    return interaction.reply({
        content: text,
        components: [
            new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
    });
}

async function selectChannel(interaction, id, text) {

    const channels =
        interaction.guild.channels.cache
            .filter(c => c.type === ChannelType.GuildText)
            .first(25);

    if (!channels.length)
        return interaction.reply({
            content: "No text channels available.",
            ephemeral: true
        });

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder("Select a channel")
            .addOptions(
                channels.map(c => ({
                    label: c.name.substring(0, 100),
                    value: c.id
                }))
            );

    return interaction.reply({
        content: text,
        components: [
            new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
    });
}

// ============================================================
// TICKET CONFIG
// ============================================================

async function sendTicketPanel(interaction, edit = false) {

    const cfg = guildConfig(interaction.guild.id);

    const staff =
        cfg.ticketStaffRoleId
            ? `<@&${cfg.ticketStaffRoleId}>`
            : "Not configured";

    const category =
        cfg.ticketCategoryId
            ? `<#${cfg.ticketCategoryId}>`
            : "Not configured";

    const logs =
        cfg.ticketLogsChannelId
            ? `<#${cfg.ticketLogsChannelId}>`
            : "Not configured";

    const e =
        embed(
            "Ticket Configuration",
            "Configure every part of the ticket system from this panel."
        )
            .addFields(
                {
                    name: "Staff Role",
                    value: staff,
                    inline: true
                },
                {
                    name: "Category",
                    value: category,
                    inline: true
                },
                {
                    name: "Ticket Logs",
                    value: logs,
                    inline: true
                }
            );

    const row1 =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_set_staff")
                .setLabel("Staff Role")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("ticket_set_category")
                .setLabel("Category")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("ticket_set_logs")
                .setLabel("Ticket Logs")
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_send_panel")
                .setLabel("Send Panel")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("ticket_refresh")
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Secondary)
        );

    if (edit)
        return interaction.update({
            embeds: [e],
            components: [row1, row2]
        });

    return interaction.reply({
        embeds: [e],
        components: [row1, row2],
        ephemeral: true
    });
}

// ============================================================
// REPORT CONFIG
// ============================================================

async function sendReportPanel(interaction) {

    const cfg = guildConfig(interaction.guild.id);

    return interaction.reply({
        embeds: [
            embed(
                "Server Report Configuration",
                "Configure the server reporting system."
            ).addFields(
                {
                    name: "Staff Role",
                    value: cfg.reportStaffRoleId
                        ? `<@&${cfg.reportStaffRoleId}>`
                        : "Not configured"
                },
                {
                    name: "Category",
                    value: cfg.reportCategoryId
                        ? `<#${cfg.reportCategoryId}>`
                        : "Not configured"
                }
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("report_set_staff")
                    .setLabel("Staff Role")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("report_set_category")
                    .setLabel("Category")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("report_send_panel")
                    .setLabel("Send Panel")
                    .setStyle(ButtonStyle.Success)
            )
        ],
        ephemeral: true
    });
}

// ============================================================
// SUBMISSION CONFIG
// ============================================================

async function sendSubmitPanel(interaction, edit = false) {

    const cfg = guildConfig(interaction.guild.id);

    const e =
        embed(
            "Server Submission Configuration",
            "Configure manual server verification and verified listings."
        )
            .addFields(
                {
                    name: "Submission Staff",
                    value: cfg.submitStaffRoleId
                        ? `<@&${cfg.submitStaffRoleId}>`
                        : "Not configured",
                    inline: true
                },
                {
                    name: "Review Category",
                    value: cfg.submitReviewCategoryId
                        ? `<#${cfg.submitReviewCategoryId}>`
                        : "Not configured",
                    inline: true
                },
                {
                    name: "Verified Channel",
                    value: cfg.verifiedChannelId
                        ? `<#${cfg.verifiedChannelId}>`
                        : "Not configured",
                    inline: true
                },
                {
                    name: "Verified Role",
                    value: cfg.verifiedRoleId
                        ? `<@&${cfg.verifiedRoleId}>`
                        : "Not configured",
                    inline: true
                }
            );

    const row1 =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("submit_set_staff")
                .setLabel("Staff Role")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("submit_set_review")
                .setLabel("Review Category")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("submit_set_verified")
                .setLabel("Verified Channel")
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("submit_set_verified_role")
                .setLabel("Verified Role")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("submit_send_panel")
                .setLabel("Send Panel")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("submit_refresh")
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Secondary)
        );

    if (edit)
        return interaction.update({
            embeds: [e],
            components: [row1, row2]
        });

    return interaction.reply({
        embeds: [e],
        components: [row1, row2],
        ephemeral: true
    });
}

// ============================================================
// VERIFICATION CONFIG
// ============================================================

async function sendVerificationPanel(interaction) {

    const cfg = guildConfig(interaction.guild.id);

    return interaction.reply({
        embeds: [
            embed(
                "Verification Configuration",
                "Configure your member verification system."
            ).addFields(
                {
                    name: "Verification Role",
                    value: cfg.verificationRoleId
                        ? `<@&${cfg.verificationRoleId}>`
                        : "Not configured"
                },
                {
                    name: "Verification Channel",
                    value: cfg.verificationChannelId
                        ? `<#${cfg.verificationChannelId}>`
                        : "Not configured"
                }
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("verification_set_role")
                    .setLabel("Verification Role")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("verification_set_channel")
                    .setLabel("Verification Channel")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("verification_send_panel")
                    .setLabel("Send Panel")
                    .setStyle(ButtonStyle.Success)
            )
        ],
        ephemeral: true
    });
}

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
