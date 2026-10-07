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
    StringSelectMenuBuilder,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ============================================================
// CONFIG
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID in .env");
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
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
});

// ============================================================
// DATA
// ============================================================

const dataFolder = path.join(__dirname, "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const warningsFile = path.join(dataFolder, "warnings.json");
const configFile = path.join(dataFolder, "config.json");

function loadJSON(file, fallback = {}) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
            return fallback;
        }

        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        console.error(`Could not load ${file}:`, error);
        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Could not save ${file}:`, error);
    }
}

let warnings = loadJSON(warningsFile, {});
let config = loadJSON(configFile, {});

// ============================================================
// TEMPORARY ENROLMENT STORAGE
// ============================================================

// Stores questionnaire answers while a user is completing
// their enrolment.
const enrolments = new Map();

// ============================================================
// EMBEDS
// ============================================================

function createEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

// ============================================================
// PERMISSION HELPERS
// ============================================================

function isStaff(member) {
    if (!member) return false;

    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    const guildConfig = config[member.guild.id];

    if (!guildConfig || !guildConfig.enrolStaffRoleId) {
        return false;
    }

    return member.roles.cache.has(guildConfig.enrolStaffRoleId);
}

function canManage(member) {
    return member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        member.permissions.has(PermissionFlagsBits.Administrator);
}

// ============================================================
// SLASH COMMANDS
// ============================================================

const commands = [

    // ---------------- BASIC ----------------

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows the bot's commands"),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Checks the bot's latency"),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("Shows information about the bot"),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Shows information about the server"),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Shows information about a user")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to view")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Shows your profile"),

    // ---------------- MODERATION ----------------

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Bans a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to ban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kicks a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to kick")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Times out a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to timeout")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Timeout duration in minutes")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Removes a member's timeout")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warns a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Warning reason")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("Shows a member's warnings")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clears a member's warnings")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Deletes messages")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    // ---------------- MANAGEMENT ----------------

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Locks the current channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlocks the current channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Changes channel slowmode")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Slowmode seconds")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("role")
        .setDescription("Adds or removes a role")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("Adds a role")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("Role")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("Removes a role")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("Role")
                        .setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Sends an announcement")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Announcement")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Creates an embed")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("Embed title")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("description")
                .setDescription("Embed description")
                .setRequired(true)
        ),

    // ---------------- TICKETS ----------------

    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription("Creates the ticket panel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription("Configures the ticket system")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // ---------------- ENROLMENT ----------------

    new SlashCommandBuilder()
        .setName("enrolschool")
        .setDescription("Start a school enrolment questionnaire"),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription("Configure the school enrolment system")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

].map(command => command.toJSON());

// ============================================================
// REGISTER COMMANDS
// ============================================================

async function registerCommands() {
    try {
        const rest = new REST({ version: "10" }).setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log("Slash commands registered successfully.");
    } catch (error) {
        console.error("Command registration error:", error);
    }
}

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} server(s)`);

    await registerCommands();

    client.user.setActivity("school enrolments", {
        type: 3
    });
});

// ============================================================
// COMMAND HANDLER
// ============================================================

client.on("interactionCreate", async interaction => {

    try {

        // ========================================================
        // SLASH COMMANDS
        // ========================================================

        if (interaction.isChatInputCommand()) {

            const command = interaction.commandName;

            // ----------------------------------------------------
            // HELP
            // ----------------------------------------------------

            if (command === "help") {

                const embed = new EmbedBuilder()
                    .setTitle("Bot Commands")
                    .setDescription("Here are the commands available in this server.")
                    .addFields(
                        {
                            name: "Basic",
                            value:
                                "`/help`\n" +
                                "`/ping`\n" +
                                "`/botinfo`\n" +
                                "`/serverinfo`\n" +
                                "`/userinfo`\n" +
                                "`/profile`"
                        },
                        {
                            name: "Moderation",
                            value:
                                "`/ban`\n" +
                                "`/kick`\n" +
                                "`/timeout`\n" +
                                "`/untimeout`\n" +
                                "`/warn`\n" +
                                "`/warnings`\n" +
                                "`/clearwarnings`\n" +
                                "`/purge`"
                        },
                        {
                            name: "Management",
                            value:
                                "`/lock`\n" +
                                "`/unlock`\n" +
                                "`/slowmode`\n" +
                                "`/role`\n" +
                                "`/announce`\n" +
                                "`/embed`"
                        },
                        {
                            name: "Tickets",
                            value:
                                "`/ticketsetup`\n" +
                                "`/ticketconfig`"
                        },
                        {
                            name: "School Enrolment",
                            value:
                                "`/enrolschool` — Start an enrolment\n" +
                                "`/enrolconfig` — Configure enrolment"
                        }
                    )
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // ----------------------------------------------------
            // PING
            // ----------------------------------------------------

            if (command === "ping") {

                return interaction.reply({
                    content: `Pong! ${client.ws.ping}ms`,
                    ephemeral: true
                });
            }

            // ----------------------------------------------------
            // BOT INFO
            // ----------------------------------------------------

            if (command === "botinfo") {

                const embed = new EmbedBuilder()
                    .setTitle("Bot Information")
                    .addFields(
                        {
                            name: "Bot",
                            value: client.user.tag,
                            inline: true
                        },
                        {
                            name: "Servers",
                            value: `${client.guilds.cache.size}`,
                            inline: true
                        },
                        {
                            name: "Discord.js",
                            value: "v14",
                            inline: true
                        }
                    )
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed]
                });
            }

            // ----------------------------------------------------
            // SERVER INFO
            // ----------------------------------------------------

            if (command === "serverinfo") {

                const guild = interaction.guild;

                const embed = new EmbedBuilder()
                    .setTitle(guild.name)
                    .addFields(
                        {
                            name: "Owner",
                            value: `<@${guild.ownerId}>`,
                            inline: true
                        },
                        {
                            name: "Members",
                            value: `${guild.memberCount}`,
                            inline: true
                        },
                        {
                            name: "Channels",
                            value: `${guild.channels.cache.size}`,
                            inline: true
                        },
                        {
                            name: "Roles",
                            value: `${guild.roles.cache.size}`,
                            inline: true
                        }
                    )
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed]
                });
            }

            // ----------------------------------------------------
            // USER INFO
            // ----------------------------------------------------

            if (command === "userinfo") {

                const user =
                    interaction.options.getUser("user") ||
                    interaction.user;

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                const embed = new EmbedBuilder()
                    .setTitle("User Information")
                    .setThumbnail(user.displayAvatarURL())
                    .addFields(
                        {
                            name: "Username",
                            value: user.tag,
                            inline: true
                        },
                        {
                            name: "User ID",
                            value: user.id,
                            inline: true
                        },
                        {
                            name: "Created",
                            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
                            inline: false
                        }
                    )
                    .setTimestamp();

                if (member) {
                    embed.addFields({
                        name: "Joined Server",
                        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
                        inline: false
                    });
                }

                return interaction.reply({
                    embeds: [embed]
                });
            }

            // ----------------------------------------------------
            // PROFILE
            // ----------------------------------------------------

            if (command === "profile") {

                const member = interaction.member;

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`${interaction.user.username}'s Profile`)
                            .setThumbnail(interaction.user.displayAvatarURL())
                            .addFields(
                                {
                                    name: "Username",
                                    value: interaction.user.tag
                                },
                                {
                                    name: "Joined",
                                    value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                                },
                                {
                                    name: "Roles",
                                    value:
                                        member.roles.cache
                                            .filter(role => role.id !== interaction.guild.id)
                                            .map(role => role.toString())
                                            .join(", ") || "None"
                                }
                            )
                            .setTimestamp()
                    ]
                });
            }

            // ----------------------------------------------------
            // BAN
            // ----------------------------------------------------

            if (command === "ban") {

                const user = interaction.options.getUser("user");
                const reason =
                    interaction.options.getString("reason") ||
                    "No reason provided";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content: "That member is not in this server.",
                        ephemeral: true
                    });
                }

                await member.ban({ reason });

                return interaction.reply({
                    content: `Banned **${user.tag}**.\nReason: ${reason}`
                });
            }

            // ----------------------------------------------------
            // KICK
            // ----------------------------------------------------

            if (command === "kick") {

                const user = interaction.options.getUser("user");
                const reason =
                    interaction.options.getString("reason") ||
                    "No reason provided";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content: "That member is not in this server.",
                        ephemeral: true
                    });
                }

                await member.kick(reason);

                return interaction.reply({
                    content: `Kicked **${user.tag}**.\nReason: ${reason}`
                });
            }

            // ----------------------------------------------------
            // TIMEOUT
            // ----------------------------------------------------

            if (command === "timeout") {

                const user = interaction.options.getUser("user");
                const minutes = interaction.options.getInteger("minutes");
                const reason =
                    interaction.options.getString("reason") ||
                    "No reason provided";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content: "That member is not in this server.",
                        ephemeral: true
                    });
                }

                await member.timeout(minutes * 60 * 1000, reason);

                return interaction.reply({
                    content: `Timed out **${user.tag}** for ${minutes} minute(s).`
                });
            }

            // ----------------------------------------------------
            // UNTIMEOUT
            // ----------------------------------------------------

            if (command === "untimeout") {

                const user = interaction.options.getUser("user");

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content: "Member not found.",
                        ephemeral: true
                    });
                }

                await member.timeout(null);

                return interaction.reply({
                    content: `Removed timeout from **${user.tag}**.`
                });
            }

            // ----------------------------------------------------
            // WARN
            // ----------------------------------------------------

            if (command === "warn") {

                const user = interaction.options.getUser("user");
                const reason = interaction.options.getString("reason");

                if (!warnings[interaction.guild.id]) {
                    warnings[interaction.guild.id] = {};
                }

                if (!warnings[interaction.guild.id][user.id]) {
                    warnings[interaction.guild.id][user.id] = [];
                }

                warnings[interaction.guild.id][user.id].push({
                    reason,
                    moderator: interaction.user.id,
                    timestamp: Date.now()
                });

                saveJSON(warningsFile, warnings);

                return interaction.reply({
                    content: `Warned **${user.tag}**.\nReason: ${reason}`
                });
            }

            // ----------------------------------------------------
            // WARNINGS
            // ----------------------------------------------------

            if (command === "warnings") {

                const user =
                    interaction.options.getUser("user") ||
                    interaction.user;

                const userWarnings =
                    warnings[interaction.guild.id]?.[user.id] || [];

                if (userWarnings.length === 0) {
                    return interaction.reply({
                        content: `**${user.tag}** has no warnings.`,
                        ephemeral: true
                    });
                }

                const text = userWarnings
                    .map((warning, index) =>
                        `**${index + 1}.** ${warning.reason} — <@${warning.moderator}>`
                    )
                    .join("\n");

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`Warnings — ${user.tag}`)
                            .setDescription(text)
                            .setTimestamp()
                    ]
                });
            }

            // ----------------------------------------------------
            // CLEAR WARNINGS
            // ----------------------------------------------------

            if (command === "clearwarnings") {

                const user = interaction.options.getUser("user");

                if (warnings[interaction.guild.id]) {
                    delete warnings[interaction.guild.id][user.id];
                }

                saveJSON(warningsFile, warnings);

                return interaction.reply({
                    content: `Cleared all warnings for **${user.tag}**.`
                });
            }

            // ----------------------------------------------------
            // PURGE
            // ----------------------------------------------------

            if (command === "purge") {

                const amount = interaction.options.getInteger("amount");

                await interaction.channel.bulkDelete(amount, true);

                return interaction.reply({
                    content: `Deleted ${amount} message(s).`,
                    ephemeral: true
                });
            }

            // ----------------------------------------------------
            // LOCK
            // ----------------------------------------------------

            if (command === "lock") {

                await interaction.channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        SendMessages: false
                    }
                );

                return interaction.reply({
                    content: "Channel locked."
                });
            }

            // ----------------------------------------------------
            // UNLOCK
            // ----------------------------------------------------

            if (command === "unlock") {

                await interaction.channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        SendMessages: null
                    }
                );

                return interaction.reply({
                    content: "Channel unlocked."
                });
            }

            // ----------------------------------------------------
            // SLOWMODE
            // ----------------------------------------------------

            if (command === "slowmode") {

                const seconds =
                    interaction.options.getInteger("seconds");

                await interaction.channel.setRateLimitPerUser(seconds);

                return interaction.reply({
                    content:
                        seconds === 0
                            ? "Slowmode disabled."
                            : `Slowmode set to ${seconds} seconds.`
                });
            }

            // ----------------------------------------------------
            // ROLE
            // ----------------------------------------------------

            if (command === "role") {

                const subcommand =
                    interaction.options.getSubcommand();

                const user =
                    interaction.options.getMember("user");

                const role =
                    interaction.options.getRole("role");

                if (role.position >= interaction.member.roles.highest.position) {
                    return interaction.reply({
                        content: "You cannot manage that role.",
                        ephemeral: true
                    });
                }

                if (subcommand === "add") {

                    await user.roles.add(role);

                    return interaction.reply({
                        content: `Added ${role} to **${user.user.tag}**.`
                    });
                }

                if (subcommand === "remove") {

                    await user.roles.remove(role);

                    return interaction.reply({
                        content: `Removed ${role} from **${user.user.tag}**.`
                    });
                }
            }

            // ----------------------------------------------------
            // ANNOUNCE
            // ----------------------------------------------------

            if (command === "announce") {

                const message =
                    interaction.options.getString("message");

                const embed = new EmbedBuilder()
                    .setTitle("Announcement")
                    .setDescription(message)
                    .setFooter({
                        text: `Posted by ${interaction.user.tag}`
                    })
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed]
                });
            }

            // ----------------------------------------------------
            // EMBED
            // ----------------------------------------------------

            if (command === "embed") {

                const title =
                    interaction.options.getString("title");

                const description =
                    interaction.options.getString("description");

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(title)
                            .setDescription(description)
                            .setTimestamp()
                    ]
                });
            }

            // ====================================================
            // TICKET SETUP
            // ====================================================

            if (command === "ticketsetup") {

                const embed = new EmbedBuilder()
                    .setTitle("Support Tickets")
                    .setDescription(
                        "Need help? Click the button below to create a support ticket."
                    );

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("create_ticket")
                        .setLabel("Create Ticket")
                        .setStyle(ButtonStyle.Primary)
                );

                return interaction.reply({
                    embeds: [embed],
                    components: [row]
                });
            }

            // ====================================================
            // TICKET CONFIG
            // ====================================================

            if (command === "ticketconfig") {

                return interaction.reply({
                    embeds: [
                        createEmbed(
                            "Ticket Configuration",
                            "The ticket system is currently using automatic ticket creation."
                        )
                    ],
                    ephemeral: true
                });
            }

            // ====================================================
            // ENROL SCHOOL
            // ====================================================

            if (command === "enrolschool") {

                const guildConfig = config[interaction.guild.id];

                if (
                    !guildConfig ||
                    !guildConfig.enrolStaffRoleId
                ) {
                    return interaction.reply({
                        content:
                            "The school enrolment system has not been configured yet. A server administrator needs to run `/enrolconfig` first.",
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle("School Enrolment")
                    .setDescription(
                        "Would you like to enrol your school?\n\n" +
                        "Click **Start Questionnaire** below to privately complete the school enrolment questionnaire."
                    );

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("start_enrol_questionnaire")
                        .setLabel("Start Questionnaire")
                        .setStyle(ButtonStyle.Primary)
                );

                return interaction.reply({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true
                });
            }

            // ====================================================
            // ENROL CONFIG
            // ====================================================

            if (command === "enrolconfig") {

                if (!canManage(interaction.member)) {
                    return interaction.reply({
                        content: "You need Manage Server permissions to use this.",
                        ephemeral: true
                    });
                }

                return sendEnrolConfigPanel(interaction);
            }
        }

        // ========================================================
        // BUTTONS
        // ========================================================

        if (interaction.isButton()) {

            // ----------------------------------------------------
            // START QUESTIONNAIRE
            // ----------------------------------------------------

            if (interaction.customId === "start_enrol_questionnaire") {

                const modal = new ModalBuilder()
                    .setCustomId("school_enrolment_modal")
                    .setTitle("School Enrolment");

                const schoolName = new TextInputBuilder()
                    .setCustomId("school_name")
                    .setLabel("What is your School's Name?")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100)
                    .setPlaceholder("Example: Wyndmere Academy");

                const description = new TextInputBuilder()
                    .setCustomId("school_description")
                    .setLabel("What is the Description for your school?")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1000)
                    .setPlaceholder("Tell us about your school...");

                const invite = new TextInputBuilder()
                    .setCustomId("school_invite")
                    .setLabel("What is your School's Discord Server Invite?")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(200)
                    .setPlaceholder("https://discord.gg/example");

                const owner = new TextInputBuilder()
                    .setCustomId("school_owner")
                    .setLabel("What is your role at the school?")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100)
                    .setPlaceholder("Owner, Headteacher, Founder...");

                const reason = new TextInputBuilder()
                    .setCustomId("school_reason")
                    .setLabel("Why should your school be enrolled?")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1000)
                    .setPlaceholder("Tell us why you want to enrol...");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(schoolName),
                    new ActionRowBuilder().addComponents(description),
                    new ActionRowBuilder().addComponents(invite),
                    new ActionRowBuilder().addComponents(owner),
                    new ActionRowBuilder().addComponents(reason)
                );

                // IMPORTANT:
                // showModal() is the initial acknowledgement.
                // Do NOT deferReply() before this.
                return interaction.showModal(modal);
            }

            // ----------------------------------------------------
            // SUBMIT ENROLMENT
            // ----------------------------------------------------

            if (interaction.customId === "submit_enrolment") {

                const enrolment = enrolments.get(interaction.user.id);

                if (!enrolment) {
                    return interaction.reply({
                        content:
                            "I couldn't find your enrolment information. Please run `/enrolschool` again.",
                        ephemeral: true
                    });
                }

                await interaction.deferReply({
                    ephemeral: true
                });

                try {

                    const guildConfig =
                        config[interaction.guild.id];

                    if (
                        !guildConfig ||
                        !guildConfig.enrolStaffRoleId
                    ) {
                        return interaction.editReply(
                            "The enrolment system has not been configured correctly."
                        );
                    }

                    const staffRole =
                        interaction.guild.roles.cache.get(
                            guildConfig.enrolStaffRoleId
                        );

                    if (!staffRole) {
                        return interaction.editReply(
                            "The configured staff role no longer exists."
                        );
                    }

                    // ------------------------------------------------
                    // CREATE REVIEW CHANNEL AUTOMATICALLY
                    // ------------------------------------------------

                    let channelName =
                        enrolment.schoolName
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, "")
                            .substring(0, 70);

                    if (!channelName) {
                        channelName = `enrolment-${interaction.user.username}`;
                    }

                    channelName =
                        `enrol-${channelName}`;

                    // Prevent duplicate channel names
                    let finalName = channelName;
                    let counter = 2;

                    while (
                        interaction.guild.channels.cache.find(
                            channel => channel.name === finalName
                        )
                    ) {
                        finalName = `${channelName}-${counter}`;
                        counter++;
                    }

                    // Only the applicant, staff role and bot can see it.
                    const overwrites = [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [
                                PermissionFlagsBits.ViewChannel
                            ]
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
                                PermissionFlagsBits.ReadMessageHistory,
                                PermissionFlagsBits.ManageMessages
                            ]
                        },
                        {
                            id: client.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory,
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.ManageMessages
                            ]
                        }
                    ];

                    const reviewChannel =
                        await interaction.guild.channels.create({
                            name: finalName,
                            type: ChannelType.GuildText,
                            permissionOverwrites: overwrites,
                            topic:
                                `School enrolment review for ${interaction.user.tag}`
                        });

                    // ------------------------------------------------
                    // REVIEW EMBED
                    // ------------------------------------------------

                    const reviewEmbed =
                        new EmbedBuilder()
                            .setTitle("New School Enrolment")
                            .setDescription(
                                `A new school enrolment has been submitted by ${interaction.user}.`
                            )
                            .addFields(
                                {
                                    name: "School Name",
                                    value: enrolment.schoolName
                                },
                                {
                                    name: "School Description",
                                    value: enrolment.schoolDescription
                                },
                                {
                                    name: "Discord Server Invite",
                                    value: enrolment.schoolInvite
                                },
                                {
                                    name: "Applicant's Role",
                                    value: enrolment.schoolOwner
                                },
                                {
                                    name: "Why should it be enrolled?",
                                    value: enrolment.schoolReason
                                },
                                {
                                    name: "Applicant",
                                    value:
                                        `${interaction.user.tag}\n${interaction.user.id}`
                                }
                            )
                            .setTimestamp();

                    const reviewButtons =
                        new ActionRowBuilder().addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    `enrol_approve_${interaction.user.id}`
                                )
                                .setLabel("Approve")
                                .setStyle(ButtonStyle.Success),

                            new ButtonBuilder()
                                .setCustomId(
                                    `enrol_deny_${interaction.user.id}`
                                )
                                .setLabel("Deny")
                                .setStyle(ButtonStyle.Danger),

                            new ButtonBuilder()
                                .setCustomId(
                                    `enrol_changes_${interaction.user.id}`
                                )
                                .setLabel("Request Changes")
                                .setStyle(ButtonStyle.Secondary)
                        );

                    await reviewChannel.send({
                        content:
                            `${staffRole} — new school enrolment awaiting review.`,
                        embeds: [reviewEmbed],
                        components: [reviewButtons]
                    });

                    // Remove the temporary data after successful creation.
                    enrolments.delete(interaction.user.id);

                    await interaction.editReply(
                        `Your enrolment has been submitted successfully.\n\nA private review channel has been created for staff: ${reviewChannel}`
                    );

                } catch (error) {

                    console.error(
                        "ENROLMENT SUBMISSION ERROR:",
                        error
                    );

                    return interaction.editReply(
                        "Something went wrong while creating your enrolment review channel. Please contact staff."
                    );
                }

                return;
            }

            // ----------------------------------------------------
            // APPROVE
            // ----------------------------------------------------

            if (interaction.customId.startsWith("enrol_approve_")) {

                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "You do not have permission to review enrolments.",
                        ephemeral: true
                    });
                }

                await interaction.deferReply({
                    ephemeral: true
                });

                const applicantId =
                    interaction.customId.replace(
                        "enrol_approve_",
                        ""
                    );

                const applicant =
                    await interaction.guild.members
                        .fetch(applicantId)
                        .catch(() => null);

                if (!applicant) {
                    return interaction.editReply(
                        "The applicant is no longer in the server."
                    );
                }

                try {

                    const guildConfig =
                        config[interaction.guild.id];

                    const approvedRoleId =
                        guildConfig?.enrolApprovedRoleId;

                    if (approvedRoleId) {

                        const role =
                            interaction.guild.roles.cache.get(
                                approvedRoleId
                            );

                        if (role) {
                            await applicant.roles.add(role);
                        }
                    }

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Enrolment Approved",
                                `This school enrolment has been **approved** by ${interaction.user}.`
                            )
                        ]
                    });

                    await applicant.send(
                        `Your school enrolment in **${interaction.guild.name}** has been approved.`
                    ).catch(() => {});

                    await interaction.editReply(
                        "The enrolment has been approved."
                    );

                } catch (error) {

                    console.error(error);

                    return interaction.editReply(
                        "I couldn't complete the approval."
                    );
                }

                return;
            }

            // ----------------------------------------------------
            // DENY
            // ----------------------------------------------------

            if (interaction.customId.startsWith("enrol_deny_")) {

                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "You do not have permission to review enrolments.",
                        ephemeral: true
                    });
                }

                const applicantId =
                    interaction.customId.replace(
                        "enrol_deny_",
                        ""
                    );

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            `enrol_deny_modal_${applicantId}`
                        )
                        .setTitle("Deny Enrolment");

                const reason =
                    new TextInputBuilder()
                        .setCustomId("deny_reason")
                        .setLabel("Reason for denial")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(1000);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(reason)
                );

                return interaction.showModal(modal);
            }

            // ----------------------------------------------------
            // REQUEST CHANGES
            // ----------------------------------------------------

            if (interaction.customId.startsWith("enrol_changes_")) {

                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "You do not have permission to review enrolments.",
                        ephemeral: true
                    });
                }

                const applicantId =
                    interaction.customId.replace(
                        "enrol_changes_",
                        ""
                    );

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            `enrol_changes_modal_${applicantId}`
                        )
                        .setTitle("Request Changes");

                const changes =
                    new TextInputBuilder()
                        .setCustomId("changes_reason")
                        .setLabel("What needs to be changed?")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(1000)
                        .setPlaceholder(
                            "Tell the applicant what they need to change..."
                        );

                modal.addComponents(
                    new ActionRowBuilder().addComponents(changes)
                );

                return interaction.showModal(modal);
            }

            // ----------------------------------------------------
            // CREATE TICKET
            // ----------------------------------------------------

            if (interaction.customId === "create_ticket") {

                await interaction.deferReply({
                    ephemeral: true
                });

                const existing =
                    interaction.guild.channels.cache.find(
                        channel =>
                            channel.name ===
                            `ticket-${interaction.user.username.toLowerCase()}`
                    );

                if (existing) {
                    return interaction.editReply(
                        `You already have a ticket: ${existing}`
                    );
                }

                const channel =
                    await interaction.guild.channels.create({
                        name:
                            `ticket-${interaction.user.username}`
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, ""),
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone.id,
                                deny: [
                                    PermissionFlagsBits.ViewChannel
                                ]
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
                                id: client.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            }
                        ]
                    });

                await channel.send({
                    embeds: [
                        createEmbed(
                            "Support Ticket",
                            `Hello ${interaction.user},\n\nPlease explain what you need help with. A member of staff will be with you shortly.`
                        )
                    ]
                });

                return interaction.editReply(
                    `Your ticket has been created: ${channel}`
                );
            }
        }

        // ========================================================
        // MODALS
        // ========================================================

        if (interaction.isModalSubmit()) {

            // ----------------------------------------------------
            // SCHOOL QUESTIONNAIRE
            // ----------------------------------------------------

            if (
                interaction.customId ===
                "school_enrolment_modal"
            ) {

                const schoolName =
                    interaction.fields.getTextInputValue(
                        "school_name"
                    );

                const schoolDescription =
                    interaction.fields.getTextInputValue(
                        "school_description"
                    );

                const schoolInvite =
                    interaction.fields.getTextInputValue(
                        "school_invite"
                    );

                const schoolOwner =
                    interaction.fields.getTextInputValue(
                        "school_owner"
                    );

                const schoolReason =
                    interaction.fields.getTextInputValue(
                        "school_reason"
                    );

                // Store the answers temporarily.
                enrolments.set(interaction.user.id, {
                    guildId: interaction.guild.id,
                    schoolName,
                    schoolDescription,
                    schoolInvite,
                    schoolOwner,
                    schoolReason,
                    createdAt: Date.now()
                });

                const preview =
                    new EmbedBuilder()
                        .setTitle("Review Your Enrolment")
                        .setDescription(
                            "Please check your answers below before submitting."
                        )
                        .addFields(
                            {
                                name: "School Name",
                                value: schoolName
                            },
                            {
                                name: "School Description",
                                value: schoolDescription
                            },
                            {
                                name: "Discord Server Invite",
                                value: schoolInvite
                            },
                            {
                                name: "Your Role",
                                value: schoolOwner
                            },
                            {
                                name: "Why should it be enrolled?",
                                value: schoolReason
                            }
                        )
                        .setTimestamp();

                const buttons =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("submit_enrolment")
                            .setLabel("Submit Enrolment")
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId("cancel_enrolment")
                            .setLabel("Cancel")
                            .setStyle(ButtonStyle.Danger)
                    );

                return interaction.reply({
                    embeds: [preview],
                    components: [buttons],
                    ephemeral: true
                });
            }

            // ----------------------------------------------------
            // DENIAL MODAL
            // ----------------------------------------------------

            if (
                interaction.customId.startsWith(
                    "enrol_deny_modal_"
                )
            ) {

                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "You do not have permission to do this.",
                        ephemeral: true
                    });
                }

                const applicantId =
                    interaction.customId.replace(
                        "enrol_deny_modal_",
                        ""
                    );

                const reason =
                    interaction.fields.getTextInputValue(
                        "deny_reason"
                    );

                const applicant =
                    await interaction.guild.members
                        .fetch(applicantId)
                        .catch(() => null);

                await interaction.channel.send({
                    embeds: [
                        createEmbed(
                            "Enrolment Denied",
                            `This enrolment has been denied by ${interaction.user}.\n\n**Reason:** ${reason}`
                        )
                    ]
                });

                if (applicant) {
                    await applicant.send(
                        `Your school enrolment in **${interaction.guild.name}** has been denied.\n\n**Reason:** ${reason}`
                    ).catch(() => {});
                }

                return interaction.reply({
                    content: "The enrolment has been denied.",
                    ephemeral: true
                });
            }

            // ----------------------------------------------------
            // CHANGES MODAL
            // ----------------------------------------------------

            if (
                interaction.customId.startsWith(
                    "enrol_changes_modal_"
                )
            ) {

                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "You do not have permission to do this.",
                        ephemeral: true
                    });
                }

                const applicantId =
                    interaction.customId.replace(
                        "enrol_changes_modal_",
                        ""
                    );

                const reason =
                    interaction.fields.getTextInputValue(
                        "changes_reason"
                    );

                const applicant =
                    await interaction.guild.members
                        .fetch(applicantId)
                        .catch(() => null);

                await interaction.channel.send({
                    embeds: [
                        createEmbed(
                            "Changes Requested",
                            `Changes have been requested by ${interaction.user}.\n\n**Changes required:** ${reason}`
                        )
                    ]
                });

                if (applicant) {
                    await applicant.send(
                        `Changes have been requested for your school enrolment in **${interaction.guild.name}**.\n\n**Changes required:** ${reason}`
                    ).catch(() => {});
                }

                return interaction.reply({
                    content: "The applicant has been notified.",
                    ephemeral: true
                });
            }
        }

    } catch (error) {

        console.error("INTERACTION ERROR:", error);

        // Prevent "Something went wrong with that action"
        // where possible by responding to an interaction that
        // has not already been acknowledged.

        try {

            if (interaction.replied || interaction.deferred) {

                await interaction.followUp({
                    content:
                        "An unexpected error occurred while processing that action.",
                    ephemeral: true
                });

            } else {

                await interaction.reply({
                    content:
                        "An unexpected error occurred while processing that action.",
                    ephemeral: true
                });
            }

        } catch (replyError) {
            console.error(
                "Could not send error response:",
                replyError
            );
        }
    }
});

// ============================================================
// CANCEL ENROLMENT
// ============================================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isButton()) return;

    if (interaction.customId !== "cancel_enrolment") {
        return;
    }

    enrolments.delete(interaction.user.id);

    return interaction.update({
        content: "Your enrolment has been cancelled.",
        embeds: [],
        components: []
    });
});

// ============================================================
// ENROLMENT CONFIG PANEL
// ============================================================

async function sendEnrolConfigPanel(interaction) {

    const guildConfig =
        config[interaction.guild.id] || {};

    const staffRole =
        guildConfig.enrolStaffRoleId
            ? interaction.guild.roles.cache.get(
                guildConfig.enrolStaffRoleId
            )
            : null;

    const approvedRole =
        guildConfig.enrolApprovedRoleId
            ? interaction.guild.roles.cache.get(
                guildConfig.enrolApprovedRoleId
            )
            : null;

    const embed =
        new EmbedBuilder()
            .setTitle("School Enrolment Configuration")
            .setDescription(
                "Use the buttons below to configure the school enrolment system.\n\n" +
                "Review channels are created **automatically** when an enrolment is submitted. " +
                "You do not need to select a review channel."
            )
            .addFields(
                {
                    name: "Staff Review Role",
                    value: staffRole
                        ? `${staffRole}`
                        : "Not configured",
                    inline: true
                },
                {
                    name: "Approved Role",
                    value: approvedRole
                        ? `${approvedRole}`
                        : "Not configured",
                    inline: true
                },
                {
                    name: "Review Channels",
                    value: "Automatically created",
                    inline: false
                }
            )
            .setTimestamp();

    const row1 =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("enrol_config_staff")
                .setLabel("Set Staff Role")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("enrol_config_approved")
                .setLabel("Set Approved Role")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("enrol_config_refresh")
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Success)
        );

    return interaction.reply({
        embeds: [embed],
        components: [row1],
        ephemeral: true
    });
}

// ============================================================
// ENROLMENT CONFIG BUTTONS
// ============================================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isButton()) return;

    try {

        if (
            ![
                "enrol_config_staff",
                "enrol_config_approved",
                "enrol_config_refresh"
            ].includes(interaction.customId)
        ) {
            return;
        }

        if (!canManage(interaction.member)) {
            return interaction.reply({
                content: "You need Manage Server permissions to do this.",
                ephemeral: true
            });
        }

        // --------------------------------------------------------
        // REFRESH
        // --------------------------------------------------------

        if (interaction.customId === "enrol_config_refresh") {
            await interaction.deferUpdate();

            const guildConfig =
                config[interaction.guild.id] || {};

            const staffRole =
                guildConfig.enrolStaffRoleId
                    ? interaction.guild.roles.cache.get(
                        guildConfig.enrolStaffRoleId
                    )
                    : null;

            const approvedRole =
                guildConfig.enrolApprovedRoleId
                    ? interaction.guild.roles.cache.get(
                        guildConfig.enrolApprovedRoleId
                    )
                    : null;

            const embed =
                new EmbedBuilder()
                    .setTitle("School Enrolment Configuration")
                    .setDescription(
                        "Use the buttons below to configure the school enrolment system.\n\n" +
                        "Review channels are created **automatically** when an enrolment is submitted."
                    )
                    .addFields(
                        {
                            name: "Staff Review Role",
                            value: staffRole
                                ? `${staffRole}`
                                : "Not configured",
                            inline: true
                        },
                        {
                            name: "Approved Role",
                            value: approvedRole
                                ? `${approvedRole}`
                                : "Not configured",
                            inline: true
                        },
                        {
                            name: "Review Channels",
                            value: "Automatically created",
                            inline: false
                        }
                    )
                    .setTimestamp();

            return interaction.editReply({
                embeds: [embed]
            });
        }

        // --------------------------------------------------------
        // STAFF ROLE
        // --------------------------------------------------------

        if (interaction.customId === "enrol_config_staff") {

            const roles =
                interaction.guild.roles.cache
                    .filter(role =>
                        role.id !== interaction.guild.id
                    )
                    .sort((a, b) => b.position - a.position)
                    .first(25);

            const options = roles.map(role => ({
                label: role.name.substring(0, 100),
                value: role.id
            }));

            if (options.length === 0) {
                return interaction.reply({
                    content: "There are no roles available.",
                    ephemeral: true
                });
            }

            const menu =
                new StringSelectMenuBuilder()
                    .setCustomId("enrol_select_staff_role")
                    .setPlaceholder("Select the staff review role")
                    .addOptions(options);

            return interaction.reply({
                content:
                    "Select the role that should be able to review school enrolments.",
                components: [
                    new ActionRowBuilder().addComponents(menu)
                ],
                ephemeral: true
            });
        }

        // --------------------------------------------------------
        // APPROVED ROLE
        // --------------------------------------------------------

        if (interaction.customId === "enrol_config_approved") {

            const roles =
                interaction.guild.roles.cache
                    .filter(role =>
                        role.id !== interaction.guild.id
                    )
                    .sort((a, b) => b.position - a.position)
                    .first(25);

            const options = roles.map(role => ({
                label: role.name.substring(0, 100),
                value: role.id
            }));

            const menu =
                new StringSelectMenuBuilder()
                    .setCustomId("enrol_select_approved_role")
                    .setPlaceholder("Select the approved school role")
                    .addOptions(options);

            return interaction.reply({
                content:
                    "Select the role that should be given when a school is approved.",
                components: [
                    new ActionRowBuilder().addComponents(menu)
                ],
                ephemeral: true
            });
        }

    } catch (error) {

        console.error(
            "ENROL CONFIG BUTTON ERROR:",
            error
        );

        if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({
                content: "Something went wrong with that action.",
                ephemeral: true
            });
        }
    }
});

// ============================================================
// ENROLMENT CONFIG SELECT MENUS
// ============================================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isStringSelectMenu()) return;

    try {

        if (
            interaction.customId ===
            "enrol_select_staff_role"
        ) {

            const roleId =
                interaction.values[0];

            if (!config[interaction.guild.id]) {
                config[interaction.guild.id] = {};
            }

            config[interaction.guild.id]
                .enrolStaffRoleId = roleId;

            saveJSON(configFile, config);

            const role =
                interaction.guild.roles.cache.get(roleId);

            return interaction.update({
                content:
                    `Staff review role set to ${role}.`,
                components: []
            });
        }

        if (
            interaction.customId ===
            "enrol_select_approved_role"
        ) {

            const roleId =
                interaction.values[0];

            if (!config[interaction.guild.id]) {
                config[interaction.guild.id] = {};
            }

            config[interaction.guild.id]
                .enrolApprovedRoleId = roleId;

            saveJSON(configFile, config);

            const role =
                interaction.guild.roles.cache.get(roleId);

            return interaction.update({
                content:
                    `Approved school role set to ${role}.`,
                components: []
            });
        }

    } catch (error) {

        console.error(
            "ENROL CONFIG SELECT ERROR:",
            error
        );

        if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({
                content:
                    "Something went wrong while saving that setting.",
                ephemeral: true
            });
        }
    }
});

// ============================================================
// CLEAN OLD TEMPORARY ENROLMENTS
// ============================================================

// Remove unfinished questionnaires after 1 hour.
setInterval(() => {

    const now = Date.now();

    for (const [userId, enrolment] of enrolments.entries()) {

        if (now - enrolment.createdAt > 60 * 60 * 1000) {
            enrolments.delete(userId);
        }
    }

}, 10 * 60 * 1000);

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
