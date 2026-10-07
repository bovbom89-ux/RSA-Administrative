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
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ============================================================
// RSA UTILITY
// ROBLOX SCHOOL ASSOCIATION
// ============================================================

// -------------------- ENVIRONMENT --------------------

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error(
        "Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID in .env"
    );
    process.exit(1);
}

// -------------------- BRANDING --------------------

const BRAND_COLOR = "#2F4DA8";
const LOGO = "<:Our_Logo:1557149633623363594>";
const BOT_NAME = "RSA Utility";

// ============================================================
// CLIENT
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
    ],
});

// ============================================================
// DATA STORAGE
// ============================================================

const dataFolder = path.join(__dirname, "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const warningsFile = path.join(dataFolder, "warnings.json");
const configFile = path.join(dataFolder, "config.json");

function loadJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(
                file,
                JSON.stringify(fallback, null, 2)
            );

            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(file, "utf8")
        );
    } catch (error) {
        console.error(`Failed loading ${file}:`, error);
        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2)
        );
    } catch (error) {
        console.error(`Failed saving ${file}:`, error);
    }
}

let warnings = loadJSON(warningsFile, {});
let config = loadJSON(configFile, {});

// ============================================================
// TEMPORARY ENROLMENT QUESTIONNAIRES
// ============================================================

const enrolments = new Map();

// Structure:
//
// userId => {
//     guildId,
//     answers: {
//         schoolName,
//         description,
//         invite,
//         ownerRole,
//         members,
//         reason
//     },
//     currentQuestion,
//     completed,
//     createdAt
// }

// ============================================================
// EMBED SYSTEM
// ============================================================

function createEmbed(title, description = null) {
    const embed = new EmbedBuilder()
        .setTitle(`${LOGO} ${title}`)
        .setColor(BRAND_COLOR)
        .setTimestamp();

    if (description) {
        embed.setDescription(description);
    }

    return embed;
}

// ============================================================
// PERMISSION HELPERS
// ============================================================

function canManage(member) {
    if (!member) return false;

    return (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        ) ||
        member.permissions.has(
            PermissionFlagsBits.ManageGuild
        )
    );
}

function isStaff(member) {
    if (!member) return false;

    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    const guildConfig =
        config[member.guild.id];

    if (!guildConfig?.enrolStaffRoleId) {
        return false;
    }

    return member.roles.cache.has(
        guildConfig.enrolStaffRoleId
    );
}

// ============================================================
// COMMANDS
// ============================================================

const commands = [

    // ========================================================
    // BASIC
    // ========================================================

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows all RSA Utility commands"),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Checks the bot latency"),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("Shows information about RSA Utility"),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Shows information about this server"),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Shows information about a user")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to view")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Shows your RSA profile"),

    // ========================================================
    // MODERATION
    // ========================================================

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Bans a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        )
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
        .setDefaultMemberPermissions(
            PermissionFlagsBits.KickMembers
        )
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
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to timeout")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Timeout duration")
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
        .setDescription("Removes a timeout")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warns a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
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
        .setDescription("Shows warnings")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clears warnings")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Deletes messages")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount to delete")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    // ========================================================
    // MANAGEMENT
    // ========================================================

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Locks the current channel")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlocks the current channel")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Changes channel slowmode")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        )
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
        .setDescription("Manage a member's roles")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageRoles
        )
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
        .setDescription("Creates an announcement")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Announcement")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Creates a branded embed")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("Title")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("description")
                .setDescription("Description")
                .setRequired(true)
        ),

    // ========================================================
    // TICKETS
    // ========================================================

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription("Configure the ticket system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // ========================================================
    // SCHOOL ENROLMENT
    // ========================================================

    new SlashCommandBuilder()
        .setName("enrolschool")
        .setDescription("Begin a Roblox School Association enrolment"),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription("Configure school enrolments")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

].map(command => command.toJSON());

// ============================================================
// REGISTER COMMANDS
// ============================================================

async function registerCommands() {

    try {

        const rest = new REST({
            version: "10"
        }).setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            "RSA Utility slash commands registered."
        );

    } catch (error) {

        console.error(
            "Command registration failed:",
            error
        );

    }
}

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {

    console.log(
        `Logged in as ${client.user.tag}`
    );

    await registerCommands();

    client.user.setActivity(
        "Roblox School Association",
        {
            type: 3
        }
    );

});

// ============================================================
// HELP
// ============================================================

function helpEmbed() {

    return createEmbed(
        "RSA Utility Commands",
        "Here are the commands available through RSA Utility."
    )
        .addFields(
            {
                name: "Basic",
                value:
                    "`/help`\n" +
                    "`/ping`\n" +
                    "`/botinfo`\n" +
                    "`/serverinfo`\n" +
                    "`/userinfo`\n" +
                    "`/profile`",
                inline: true
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
                    "`/purge`",
                inline: true
            },
            {
                name: "Management",
                value:
                    "`/lock`\n" +
                    "`/unlock`\n" +
                    "`/slowmode`\n" +
                    "`/role`\n" +
                    "`/announce`\n" +
                    "`/embed`",
                inline: true
            },
            {
                name: "Tickets",
                value:
                    "`/ticketconfig`\n\n" +
                    "Tickets are created from the configured panel.",
                inline: true
            },
            {
                name: "School Enrolment",
                value:
                    "`/enrolschool`\n" +
                    "`/enrolconfig`\n\n" +
                    "Schools complete their questionnaire privately through DMs.",
                inline: true
            }
        );
}

// ============================================================
// ENROLMENT CONFIG EMBED
// ============================================================

function buildEnrolConfigEmbed(guild) {

    const guildConfig =
        config[guild.id] || {};

    const staffRole =
        guildConfig.enrolStaffRoleId
            ? guild.roles.cache.get(
                guildConfig.enrolStaffRoleId
            )
            : null;

    const approvedRole =
        guildConfig.enrolApprovedRoleId
            ? guild.roles.cache.get(
                guildConfig.enrolApprovedRoleId
            )
            : null;

    const enrolChannel =
        guildConfig.enrolChannelId
            ? guild.channels.cache.get(
                guildConfig.enrolChannelId
            )
            : null;

    const reviewCategory =
        guildConfig.enrolReviewCategoryId
            ? guild.channels.cache.get(
                guildConfig.enrolReviewCategoryId
            )
            : null;

    return createEmbed(
        "School Enrolment Configuration",
        "Configure how the Roblox School Association enrolment system operates.\n\n" +
        "**Review channels are automatically created.** Staff do not need to manually create one."
    )
        .addFields(
            {
                name: "Staff Review Role",
                value:
                    staffRole
                        ? `${staffRole}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Approved School Role",
                value:
                    approvedRole
                        ? `${approvedRole}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Enrolment Channel",
                value:
                    enrolChannel
                        ? `${enrolChannel}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Review Category",
                value:
                    reviewCategory
                        ? `${reviewCategory}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Review Access",
                value:
                    "Staff only. The applicant will **not** be given access.",
                inline: false
            },
            {
                name: "Approval",
                value:
                    "Approved schools receive their configured role and a clean enrolment announcement.",
                inline: false
            }
        );
}

// ============================================================
// ENROLMENT CONFIG PANEL
// ============================================================

function enrolConfigComponents() {

    return [

        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("enrolcfg_staff")
                .setLabel("Staff Role")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("enrolcfg_approved")
                .setLabel("Approved Role")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("enrolcfg_channel")
                .setLabel("Enrolment Channel")
                .setStyle(ButtonStyle.Secondary)

        ),

        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("enrolcfg_category")
                .setLabel("Review Category")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("enrolcfg_refresh")
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Success)

        )

    ];
}

// ============================================================
// TICKET CONFIG EMBED
// ============================================================

function buildTicketConfigEmbed(guild) {

    const guildConfig =
        config[guild.id] || {};

    const staffRole =
        guildConfig.ticketStaffRoleId
            ? guild.roles.cache.get(
                guildConfig.ticketStaffRoleId
            )
            : null;

    const category =
        guildConfig.ticketCategoryId
            ? guild.channels.cache.get(
                guildConfig.ticketCategoryId
            )
            : null;

    return createEmbed(
        "Ticket Configuration",
        "Configure the RSA Utility ticket system from this panel."
    )
        .addFields(
            {
                name: "Staff Role",
                value:
                    staffRole
                        ? `${staffRole}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Ticket Category",
                value:
                    category
                        ? `${category}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Panel",
                value:
                    "Use **Send Ticket Panel** to send the public ticket panel into the current channel.",
                inline: false
            }
        );
}

function ticketConfigComponents() {

    return [

        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("ticketcfg_staff")
                .setLabel("Staff Role")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("ticketcfg_category")
                .setLabel("Ticket Category")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("ticketcfg_send")
                .setLabel("Send Ticket Panel")
                .setStyle(ButtonStyle.Success)

        )

    ];
}

// ============================================================
// TICKET PANEL
// ============================================================

function ticketPanel() {

    const embed = createEmbed(
        "RSA Support",
        "Need help from the Roblox School Association team?\n\n" +
        "Click **Create Ticket** below to open a private support ticket.\n\n" +
        "Please provide as much information as possible so our staff team can assist you."
    );

    const row =
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("ticket_create")
                .setLabel("Create Ticket")
                .setStyle(ButtonStyle.Primary)

        );

    return {
        embeds: [embed],
        components: [row]
    };
}

// ============================================================
// QUESTIONNAIRE QUESTIONS
// ============================================================

const enrolQuestions = [

    {
        id: "schoolName",
        number: 1,
        question:
            "What is your school's name?",
        placeholder:
            "Example: Wyndmere Academy"
    },

    {
        id: "description",
        number: 2,
        question:
            "What is the description for your school?",
        placeholder:
            "Tell us about your school."
    },

    {
        id: "invite",
        number: 3,
        question:
            "What is your school's Discord server invite?",
        placeholder:
            "Example: https://discord.gg/example"
    },

    {
        id: "ownerRole",
        number: 4,
        question:
            "What is your role within the school?",
        placeholder:
            "Example: Founder, Headteacher, Owner"
    },

    {
        id: "members",
        number: 5,
        question:
            "Approximately how many members does your school have?",
        placeholder:
            "Example: 50"
    },

    {
        id: "reason",
        number: 6,
        question:
            "Why would you like your school to join the Roblox School Association?",
        placeholder:
            "Explain why you would like to join."
    }

];

// ============================================================
// START ENROLMENT
// ============================================================

async function startEnrolment(user, guild) {

    if (!config[guild.id]?.enrolStaffRoleId) {

        return user.send({
            embeds: [
                createEmbed(
                    "Enrolment Unavailable",
                    "The Roblox School Association enrolment system has not been configured yet."
                )
            ]
        }).catch(() => {});

    }

    if (
        enrolments.has(user.id)
    ) {

        return user.send({
            embeds: [
                createEmbed(
                    "Enrolment Already Started",
                    "You already have an active questionnaire.\n\nPlease finish or cancel your current questionnaire before starting another one."
                )
            ]
        }).catch(() => {});

    }

    const session = {
        guildId: guild.id,
        answers: {},
        currentQuestion: 0,
        completed: false,
        createdAt: Date.now()
    };

    enrolments.set(
        user.id,
        session
    );

    await user.send({
        embeds: [
            createEmbed(
                "School Enrolment",
                "Welcome to the **Roblox School Association** enrolment process.\n\n" +
                "I will ask you **6 questions**, one at a time.\n\n" +
                "Please answer each question normally in this DM.\n\n" +
                "At the end, you will be able to review your answers before submitting your enrolment."
            )
        ]
    });

    await askEnrolmentQuestion(user);

}

// ============================================================
// ASK QUESTION
// ============================================================

async function askEnrolmentQuestion(user) {

    const session =
        enrolments.get(user.id);

    if (!session) return;

    const question =
        enrolQuestions[
            session.currentQuestion
        ];

    if (!question) {

        session.completed = true;

        return showEnrolmentReview(user);

    }

    await user.send({
        embeds: [
            createEmbed(
                `Question ${question.number} of ${enrolQuestions.length}`,
                `**${question.question}**\n\n` +
                `Reply to this message with your answer.\n\n` +
                `Example: ${question.placeholder}`
            )
        ]
    });

}

// ============================================================
// QUESTIONNAIRE MESSAGE HANDLER
// ============================================================

client.on(
    "messageCreate",
    async message => {

        try {

            if (message.author.bot) {
                return;
            }

            if (
                message.channel.type !==
                ChannelType.DM
            ) {
                return;
            }

            const session =
                enrolments.get(
                    message.author.id
                );

            if (!session) {
                return;
            }

            if (session.completed) {
                return;
            }

            const question =
                enrolQuestions[
                    session.currentQuestion
                ];

            if (!question) {
                return;
            }

            const answer =
                message.content.trim();

            if (!answer) {
                return;
            }

            if (answer.length > 1500) {

                return message.reply(
                    "That answer is too long. Please keep your response under 1500 characters."
                );

            }

            session.answers[
                question.id
            ] = answer;

            session.currentQuestion++;

            if (
                session.currentQuestion >=
                enrolQuestions.length
            ) {

                session.completed = true;

                return showEnrolmentReview(
                    message.author
                );

            }

            await message.reply({
                embeds: [
                    createEmbed(
                        "Answer Saved",
                        "Your answer has been saved."
                    )
                ]
            });

            await askEnrolmentQuestion(
                message.author
            );

        } catch (error) {

            console.error(
                "DM questionnaire error:",
                error
            );

        }

    }
);

// ============================================================
// ENROLMENT REVIEW
// ============================================================

async function showEnrolmentReview(user) {

    const session =
        enrolments.get(user.id);

    if (!session) return;

    const answers =
        session.answers;

    const embed =
        createEmbed(
            "Review Your Enrolment",
            "Your questionnaire is complete.\n\n" +
            "Please check every answer carefully before submitting."
        )
        .addFields(
            {
                name: "1. School Name",
                value:
                    answers.schoolName ||
                    "Not provided"
            },
            {
                name: "2. School Description",
                value:
                    answers.description ||
                    "Not provided"
            },
            {
                name: "3. Discord Server Invite",
                value:
                    answers.invite ||
                    "Not provided"
            },
            {
                name: "4. Your Role",
                value:
                    answers.ownerRole ||
                    "Not provided"
            },
            {
                name: "5. Approximate Members",
                value:
                    answers.members ||
                    "Not provided"
            },
            {
                name: "6. Reason for Joining",
                value:
                    answers.reason ||
                    "Not provided"
            }
        );

    const buttons =
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("enrol_submit")
                .setLabel("Submit Enrolment")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("enrol_edit")
                .setLabel("Modify Answers")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("enrol_cancel")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)

        );

    return user.send({
        embeds: [embed],
        components: [buttons]
    });

}

// ============================================================
// MODIFY ANSWERS
// ============================================================

function editQuestionMenu() {

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                "enrol_edit_question"
            )
            .setPlaceholder(
                "Select an answer to modify"
            )
            .addOptions(
                enrolQuestions.map(
                    question => ({
                        label:
                            `Question ${question.number}`,
                        description:
                            question.question.substring(
                                0,
                                90
                            ),
                        value:
                            question.id
                    })
                )
            );

    return [
        new ActionRowBuilder()
            .addComponents(menu)
    ];

}

// ============================================================
// EDIT QUESTION MODAL
// ============================================================

function createEditModal(
    question,
    currentAnswer
) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                `enrol_edit_modal_${question.id}`
            )
            .setTitle(
                `Edit Question ${question.number}`
            );

    const input =
        new TextInputBuilder()
            .setCustomId("answer")
            .setLabel(
                question.question.substring(
                    0,
                    45
                )
            )
            .setStyle(
                question.id === "description" ||
                question.id === "reason"
                    ? TextInputStyle.Paragraph
                    : TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(1500)
            .setValue(
                currentAnswer || ""
            );

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(input)
    );

    return modal;

}

// ============================================================
// CREATE REVIEW CHANNEL
// ============================================================

async function createReviewChannel(
    guild,
    user,
    session
) {

    const guildConfig =
        config[guild.id];

    if (
        !guildConfig?.enrolStaffRoleId
    ) {
        throw new Error(
            "No enrolment staff role configured."
        );
    }

    const staffRole =
        guild.roles.cache.get(
            guildConfig.enrolStaffRoleId
        );

    if (!staffRole) {
        throw new Error(
            "Configured enrolment staff role does not exist."
        );
    }

    const category =
        guildConfig.enrolReviewCategoryId
            ? guild.channels.cache.get(
                guildConfig.enrolReviewCategoryId
            )
            : null;

    let baseName =
        session.answers.schoolName
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-|-$/g,
                ""
            )
            .substring(0, 60);

    if (!baseName) {
        baseName = "school";
    }

    let channelName =
        `enrol-${baseName}`;

    let counter = 2;

    while (
        guild.channels.cache.find(
            channel =>
                channel.name ===
                channelName
        )
    ) {

        channelName =
            `enrol-${baseName}-${counter}`;

        counter++;

    }

    const overwrites = [

        {
            id: guild.roles.everyone.id,
            deny: [
                PermissionFlagsBits.ViewChannel
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

    const channel =
        await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent:
                category?.type ===
                ChannelType.GuildCategory
                    ? category.id
                    : undefined,
            permissionOverwrites:
                overwrites,
            topic:
                `RSA School Enrolment Review | ${user.tag}`
        });

    const embed =
        createEmbed(
            "School Enrolment Review",
            "A new school enrolment is awaiting staff review."
        )
        .addFields(
            {
                name: "School Name",
                value:
                    session.answers.schoolName
            },
            {
                name: "Description",
                value:
                    session.answers.description
            },
            {
                name: "Discord Server",
                value:
                    session.answers.invite
            },
            {
                name: "Applicant's Role",
                value:
                    session.answers.ownerRole
            },
            {
                name: "Approximate Members",
                value:
                    session.answers.members
            },
            {
                name: "Reason for Joining",
                value:
                    session.answers.reason
            },
            {
                name: "Applicant",
                value:
                    `${user}\n${user.tag}\n${user.id}`
            }
        );

    const buttons =
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `enrol_approve_${user.id}`
                )
                .setLabel("Approve")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(
                    `enrol_deny_${user.id}`
                )
                .setLabel("Deny")
                .setStyle(ButtonStyle.Danger)

        );

    await channel.send({
        content:
            `${staffRole} — a new school enrolment requires review.`,
        embeds: [embed],
        components: [buttons]
    });

    return channel;

}

// ============================================================
// CLEAN APPROVED SCHOOL EMBED
// ============================================================

function buildApprovedSchoolEmbed(
    school,
    approvedBy
) {

    return createEmbed(
        "School Enrolled",
        "A school has officially been enrolled with the **Roblox School Association**."
    )
        .addFields(
            {
                name: "School",
                value:
                    school.schoolName
            },
            {
                name: "Description",
                value:
                    school.description
            },
            {
                name: "Discord Server",
                value:
                    school.invite
            },
            {
                name: "School Representative",
                value:
                    school.ownerRole
            },
            {
                name: "Members",
                value:
                    school.members,
                inline: true
            },
            {
                name: "Status",
                value:
                    "Officially Enrolled",
                inline: true
            },
            {
                name: "Approved By",
                value:
                    `${approvedBy}`,
                inline: true
            }
        )
        .setFooter({
            text:
                "Roblox School Association"
        });

}

// ============================================================
// COMMAND HANDLER
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // ====================================================
            // SLASH COMMANDS
            // ====================================================

            if (
                interaction.isChatInputCommand()
            ) {

                const command =
                    interaction.commandName;

                // ==================================================
                // HELP
                // ==================================================

                if (command === "help") {

                    return interaction.reply({
                        embeds: [
                            helpEmbed()
                        ],
                        ephemeral: true
                    });

                }

                // ==================================================
                // PING
                // ==================================================

                if (command === "ping") {

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Pong!",
                                `WebSocket latency: **${client.ws.ping}ms**`
                            )
                        ],
                        ephemeral: true
                    });

                }

                // ==================================================
                // BOT INFO
                // ==================================================

                if (command === "botinfo") {

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Bot Information"
                            )
                                .addFields(
                                    {
                                        name: "Bot",
                                        value:
                                            client.user.tag,
                                        inline: true
                                    },
                                    {
                                        name: "Servers",
                                        value:
                                            `${client.guilds.cache.size}`,
                                        inline: true
                                    },
                                    {
                                        name: "Discord.js",
                                        value:
                                            "v14",
                                        inline: true
                                    }
                                )
                        ]
                    });

                }

                // ==================================================
                // SERVER INFO
                // ==================================================

                if (command === "serverinfo") {

                    const guild =
                        interaction.guild;

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Server Information"
                            )
                                .setThumbnail(
                                    guild.iconURL({
                                        size: 256
                                    })
                                )
                                .addFields(
                                    {
                                        name: "Server",
                                        value:
                                            guild.name,
                                        inline: true
                                    },
                                    {
                                        name: "Owner",
                                        value:
                                            `<@${guild.ownerId}>`,
                                        inline: true
                                    },
                                    {
                                        name: "Members",
                                        value:
                                            `${guild.memberCount}`,
                                        inline: true
                                    },
                                    {
                                        name: "Channels",
                                        value:
                                            `${guild.channels.cache.size}`,
                                        inline: true
                                    },
                                    {
                                        name: "Roles",
                                        value:
                                            `${guild.roles.cache.size}`,
                                        inline: true
                                    }
                                )
                        ]
                    });

                }

                // ==================================================
                // USER INFO
                // ==================================================

                if (command === "userinfo") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    const member =
                        await interaction.guild
                            .members
                            .fetch(user.id)
                            .catch(
                                () => null
                            );

                    const embed =
                        createEmbed(
                            "User Information"
                        )
                            .setThumbnail(
                                user.displayAvatarURL()
                            )
                            .addFields(
                                {
                                    name: "Username",
                                    value:
                                        user.tag,
                                    inline: true
                                },
                                {
                                    name: "User ID",
                                    value:
                                        user.id,
                                    inline: true
                                },
                                {
                                    name: "Account Created",
                                    value:
                                        `<t:${Math.floor(
                                            user.createdTimestamp / 1000
                                        )}:F>`
                                }
                            );

                    if (member) {

                        embed.addFields(
                            {
                                name: "Joined Server",
                                value:
                                    `<t:${Math.floor(
                                        member.joinedTimestamp / 1000
                                    )}:F`
                            },
                            {
                                name: "Roles",
                                value:
                                    member.roles.cache
                                        .filter(
                                            role =>
                                                role.id !==
                                                interaction.guild.id
                                        )
                                        .map(
                                            role =>
                                                role.toString()
                                        )
                                        .join(
                                            ", "
                                        ) ||
                                    "None"
                            }
                        );

                    }

                    return interaction.reply({
                        embeds: [embed]
                    });

                }

                // ==================================================
                // PROFILE
                // ==================================================

                if (command === "profile") {

                    const member =
                        interaction.member;

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                `${interaction.user.username}'s Profile`
                            )
                                .setThumbnail(
                                    interaction.user.displayAvatarURL()
                                )
                                .addFields(
                                    {
                                        name: "Username",
                                        value:
                                            interaction.user.tag
                                    },
                                    {
                                        name: "Joined",
                                        value:
                                            `<t:${Math.floor(
                                                member.joinedTimestamp / 1000
                                            )}:R>`
                                    },
                                    {
                                        name: "Roles",
                                        value:
                                            member.roles.cache
                                                .filter(
                                                    role =>
                                                        role.id !==
                                                        interaction.guild.id
                                                )
                                                .map(
                                                    role =>
                                                        role.toString()
                                                )
                                                .join(
                                                    ", "
                                                ) ||
                                            "None"
                                    }
                                )
                        ]
                    });

                }

                // ==================================================
                // BAN
                // ==================================================

                if (command === "ban") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided";

                    const member =
                        await interaction.guild
                            .members
                            .fetch(user.id)
                            .catch(
                                () => null
                            );

                    if (!member) {

                        return interaction.reply({
                            content:
                                "That member is not in this server.",
                            ephemeral: true
                        });

                    }

                    await member.ban({
                        reason
                    });

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Member Banned",
                                `**${user.tag}** has been banned.\n\n**Reason:** ${reason}`
                            )
                        ]
                    });

                }

                // ==================================================
                // KICK
                // ==================================================

                if (command === "kick") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided";

                    const member =
                        await interaction.guild
                            .members
                            .fetch(user.id)
                            .catch(
                                () => null
                            );

                    if (!member) {

                        return interaction.reply({
                            content:
                                "That member is not in this server.",
                            ephemeral: true
                        });

                    }

                    await member.kick(
                        reason
                    );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Member Kicked",
                                `**${user.tag}** has been kicked.\n\n**Reason:** ${reason}`
                            )
                        ]
                    });

                }

                // ==================================================
                // TIMEOUT
                // ==================================================

                if (command === "timeout") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const minutes =
                        interaction.options.getInteger(
                            "minutes"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided";

                    const member =
                        await interaction.guild
                            .members
                            .fetch(user.id)
                            .catch(
                                () => null
                            );

                    if (!member) {

                        return interaction.reply({
                            content:
                                "Member not found.",
                            ephemeral: true
                        });

                    }

                    await member.timeout(
                        minutes * 60 * 1000,
                        reason
                    );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Member Timed Out",
                                `**${user.tag}** has been timed out for **${minutes} minute(s)**.\n\n**Reason:** ${reason}`
                            )
                        ]
                    });

                }

                // ==================================================
                // UNTIMEOUT
                // ==================================================

                if (command === "untimeout") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const member =
                        await interaction.guild
                            .members
                            .fetch(user.id)
                            .catch(
                                () => null
                            );

                    if (!member) {

                        return interaction.reply({
                            content:
                                "Member not found.",
                            ephemeral: true
                        });

                    }

                    await member.timeout(
                        null
                    );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Timeout Removed",
                                `The timeout has been removed from **${user.tag}**.`
                            )
                        ]
                    });

                }

                // ==================================================
                // WARN
                // ==================================================

                if (command === "warn") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        );

                    if (
                        !warnings[
                            interaction.guild.id
                        ]
                    ) {
                        warnings[
                            interaction.guild.id
                        ] = {};
                    }

                    if (
                        !warnings[
                            interaction.guild.id
                        ][user.id]
                    ) {
                        warnings[
                            interaction.guild.id
                        ][user.id] = [];
                    }

                    warnings[
                        interaction.guild.id
                    ][user.id].push({
                        reason,
                        moderator:
                            interaction.user.id,
                        timestamp:
                            Date.now()
                    });

                    saveJSON(
                        warningsFile,
                        warnings
                    );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Member Warned",
                                `**${user.tag}** has received a warning.\n\n**Reason:** ${reason}`
                            )
                        ]
                    });

                }

                // ==================================================
                // WARNINGS
                // ==================================================

                if (command === "warnings") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    const list =
                        warnings[
                            interaction.guild.id
                        ]?.[user.id] ||
                        [];

                    if (!list.length) {

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Warnings",
                                    `**${user.tag}** has no recorded warnings.`
                                )
                            ],
                            ephemeral: true
                        });

                    }

                    const description =
                        list
                            .map(
                                (warning, index) =>
                                    `**${index + 1}.** ${warning.reason}\nModerator: <@${warning.moderator}>`
                            )
                            .join(
                                "\n\n"
                            );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                `Warnings — ${user.tag}`,
                                description
                            )
                        ]
                    });

                }

                // ==================================================
                // CLEAR WARNINGS
                // ==================================================

                if (command === "clearwarnings") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    if (
                        warnings[
                            interaction.guild.id
                        ]
                    ) {
                        delete warnings[
                            interaction.guild.id
                        ][user.id];
                    }

                    saveJSON(
                        warningsFile,
                        warnings
                    );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Warnings Cleared",
                                `All warnings for **${user.tag}** have been cleared.`
                            )
                        ]
                    });

                }

                // ==================================================
                // PURGE
                // ==================================================

                if (command === "purge") {

                    const amount =
                        interaction.options.getInteger(
                            "amount"
                        );

                    await interaction.channel.bulkDelete(
                        amount,
                        true
                    );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Messages Deleted",
                                `Deleted **${amount}** message(s).`
                            )
                        ],
                        ephemeral: true
                    });

                }

                // ==================================================
                // LOCK
                // ==================================================

                if (command === "lock") {

                    await interaction.channel
                        .permissionOverwrites
                        .edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages:
                                    false
                            }
                        );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Channel Locked",
                                "This channel has been locked."
                            )
                        ]
                    });

                }

                // ==================================================
                // UNLOCK
                // ==================================================

                if (command === "unlock") {

                    await interaction.channel
                        .permissionOverwrites
                        .edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages:
                                    null
                            }
                        );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Channel Unlocked",
                                "This channel has been unlocked."
                            )
                        ]
                    });

                }

                // ==================================================
                // SLOWMODE
                // ==================================================

                if (command === "slowmode") {

                    const seconds =
                        interaction.options.getInteger(
                            "seconds"
                        );

                    await interaction.channel
                        .setRateLimitPerUser(
                            seconds
                        );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Slowmode Updated",
                                seconds === 0
                                    ? "Slowmode has been disabled."
                                    : `Slowmode has been set to **${seconds} seconds**.`
                            )
                        ]
                    });

                }

                // ==================================================
                // ROLE
                // ==================================================

                if (command === "role") {

                    const sub =
                        interaction.options
                            .getSubcommand();

                    const member =
                        interaction.options
                            .getMember(
                                "user"
                            );

                    const role =
                        interaction.options
                            .getRole(
                                "role"
                            );

                    if (
                        role.position >=
                        interaction.member.roles.highest.position
                    ) {

                        return interaction.reply({
                            content:
                                "You cannot manage that role because it is above or equal to your highest role.",
                            ephemeral: true
                        });

                    }

                    if (
                        role.position >=
                        interaction.guild.members.me.roles.highest.position
                    ) {

                        return interaction.reply({
                            content:
                                "I cannot manage that role because it is above my highest role.",
                            ephemeral: true
                        });

                    }

                    if (
                        sub === "add"
                    ) {

                        await member.roles.add(
                            role
                        );

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Role Added",
                                    `Added ${role} to **${member.user.tag}**.`
                                )
                            ]
                        });

                    }

                    if (
                        sub === "remove"
                    ) {

                        await member.roles.remove(
                            role
                        );

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Role Removed",
                                    `Removed ${role} from **${member.user.tag}**.`
                                )
                            ]
                        });

                    }

                }

                // ==================================================
                // ANNOUNCE
                // ==================================================

                if (command === "announce") {

                    const message =
                        interaction.options.getString(
                            "message"
                        );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Announcement",
                                message
                            )
                                .setFooter({
                                    text:
                                        `Posted by ${interaction.user.tag}`
                                })
                        ]
                    });

                }

                // ==================================================
                // EMBED
                // ==================================================

                if (command === "embed") {

                    const title =
                        interaction.options.getString(
                            "title"
                        );

                    const description =
                        interaction.options.getString(
                            "description"
                        );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                title,
                                description
                            )
                        ]
                    });

                }

                // ==================================================
                // TICKET CONFIG
                // ==================================================

                if (
                    command ===
                    "ticketconfig"
                ) {

                    return interaction.reply({
                        embeds: [
                            buildTicketConfigEmbed(
                                interaction.guild
                            )
                        ],
                        components:
                            ticketConfigComponents(),
                        ephemeral: true
                    });

                }

                // ==================================================
                // ENROL SCHOOL
                // ==================================================

                if (
                    command ===
                    "enrolschool"
                ) {

                    try {

                        await interaction.user.send({
                            embeds: [
                                createEmbed(
                                    "School Enrolment",
                                    "You have started a **Roblox School Association** enrolment.\n\n" +
                                    "The questionnaire will be completed privately in this DM.\n\n" +
                                    "Click **Start Questionnaire** to begin."
                                )
                            ],
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(
                                                `enrol_start_${interaction.guild.id}`
                                            )
                                            .setLabel(
                                                "Start Questionnaire"
                                            )
                                            .setStyle(
                                                ButtonStyle.Primary
                                            )
                                    )
                            ]
                        });

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Check Your DMs",
                                    "I've sent you the school enrolment questionnaire in a private DM."
                                )
                            ],
                            ephemeral: true
                        });

                    } catch (error) {

                        console.error(
                            "Could not DM enrolment:",
                            error
                        );

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Unable to Start",
                                    "I couldn't send you a DM. Please enable DMs from server members and try again."
                                )
                            ],
                            ephemeral: true
                        });

                    }

                }

                // ==================================================
                // ENROL CONFIG
                // ==================================================

                if (
                    command ===
                    "enrolconfig"
                ) {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "You need Manage Server permissions to use this.",
                            ephemeral: true
                        });

                    }

                    return interaction.reply({
                        embeds: [
                            buildEnrolConfigEmbed(
                                interaction.guild
                            )
                        ],
                        components:
                            enrolConfigComponents(),
                        ephemeral: true
                    });

                }

            }

            // ====================================================
            // BUTTONS
            // ====================================================

            if (
                interaction.isButton()
            ) {

                // ==================================================
                // START QUESTIONNAIRE
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "enrol_start_"
                    )
                ) {

                    const guildId =
                        interaction.customId.replace(
                            "enrol_start_",
                            ""
                        );

                    const guild =
                        client.guilds.cache.get(
                            guildId
                        );

                    if (!guild) {

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Error",
                                    "I couldn't find the server connected to this enrolment."
                                )
                            ]
                        });

                    }

                    if (
                        enrolments.has(
                            interaction.user.id
                        )
                    ) {

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Already Started",
                                    "You already have an active enrolment questionnaire."
                                )
                            ]
                        });

                    }

                    await interaction.deferUpdate();

                    await startEnrolment(
                        interaction.user,
                        guild
                    );

                    return;

                }

                // ==================================================
                // SUBMIT ENROLMENT
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_submit"
                ) {

                    const session =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!session) {

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Enrolment Expired",
                                    "Your questionnaire could not be found. Please run `/enrolschool` again."
                                )
                            ]
                        });

                    }

                    const guild =
                        client.guilds.cache.get(
                            session.guildId
                        );

                    if (!guild) {

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Error",
                                    "The server associated with this enrolment could not be found."
                                )
                            ]
                        });

                    }

                    await interaction.deferUpdate();

                    try {

                        const reviewChannel =
                            await createReviewChannel(
                                guild,
                                interaction.user,
                                session
                            );

                        enrolments.delete(
                            interaction.user.id
                        );

                        await interaction.editReply({
                            embeds: [
                                createEmbed(
                                    "Enrolment Submitted",
                                    "Your school enrolment has been submitted successfully.\n\n" +
                                    "The RSA staff team will now review your application.\n\n" +
                                    "You will receive a DM when a decision has been made."
                                )
                            ],
                            components: []
                        });

                    } catch (error) {

                        console.error(
                            "Enrolment submission error:",
                            error
                        );

                        return interaction.editReply({
                            embeds: [
                                createEmbed(
                                    "Submission Failed",
                                    "I couldn't create the private review channel. Please contact an RSA administrator."
                                )
                            ]
                        });

                    }

                    return;

                }

                // ==================================================
                // MODIFY ANSWERS
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_edit"
                ) {

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Modify Your Answers",
                                "Select the question you would like to change."
                            )
                        ],
                        components:
                            editQuestionMenu()
                    });

                }

                // ==================================================
                // CANCEL ENROLMENT
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_cancel"
                ) {

                    enrolments.delete(
                        interaction.user.id
                    );

                    return interaction.update({
                        embeds: [
                            createEmbed(
                                "Enrolment Cancelled",
                                "Your school enrolment questionnaire has been cancelled."
                            )
                        ],
                        components: []
                    });

                }

                // ==================================================
                // APPROVE
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "enrol_approve_"
                    )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "You do not have permission to approve enrolments.",
                            ephemeral: true
                        });

                    }

                    const applicantId =
                        interaction.customId.replace(
                            "enrol_approve_",
                            ""
                        );

                    const reviewMessage =
                        interaction.message;

                    const applicant =
                        await interaction.guild
                            .members
                            .fetch(
                                applicantId
                            )
                            .catch(
                                () => null
                            );

                    if (!applicant) {

                        return interaction.reply({
                            content:
                                "The applicant is no longer in this server.",
                            ephemeral: true
                        });

                    }

                    const originalEmbed =
                        reviewMessage.embeds[0];

                    if (!originalEmbed) {

                        return interaction.reply({
                            content:
                                "The enrolment information could not be found.",
                            ephemeral: true
                        });

                    }

                    const fields =
                        originalEmbed.fields;

                    const getField =
                        name => {

                            const field =
                                fields.find(
                                    item =>
                                        item.name ===
                                        name
                                );

                            return (
                                field?.value ||
                                "Not provided"
                            );

                        };

                    const school = {

                        schoolName:
                            getField(
                                "School Name"
                            ),

                        description:
                            getField(
                                "Description"
                            ),

                        invite:
                            getField(
                                "Discord Server"
                            ),

                        ownerRole:
                            getField(
                                "Applicant's Role"
                            ),

                        members:
                            getField(
                                "Approximate Members"
                            ),

                        reason:
                            getField(
                                "Reason for Joining"
                            )

                    };

                    await interaction.deferUpdate();

                    try {

                        const approvedRole =
                            config[
                                interaction.guild.id
                            ]?.enrolApprovedRoleId;

                        if (approvedRole) {

                            const role =
                                interaction.guild
                                    .roles
                                    .cache.get(
                                        approvedRole
                                    );

                            if (role) {

                                await applicant.roles.add(
                                    role
                                );

                            }

                        }

                        const enrolChannelId =
                            config[
                                interaction.guild.id
                            ]?.enrolChannelId;

                        const enrolChannel =
                            enrolChannelId
                                ? interaction.guild
                                    .channels
                                    .cache.get(
                                        enrolChannelId
                                    )
                                : null;

                        // ------------------------------------------
                        // CLEAN PUBLIC ENROLMENT EMBED
                        // ------------------------------------------

                        if (
                            enrolChannel &&
                            enrolChannel.isTextBased()
                        ) {

                            await enrolChannel.send({
                                embeds: [
                                    buildApprovedSchoolEmbed(
                                        school,
                                        interaction.user
                                    )
                                ]
                            });

                        }

                        await applicant.user.send({
                            embeds: [
                                createEmbed(
                                    "School Enrolment Approved",
                                    `Congratulations! Your school, **${school.schoolName}**, has been officially enrolled with the **Roblox School Association**.\n\n` +
                                    "Thank you for joining the RSA."
                                )
                            ]
                        }).catch(
                            () => {}
                        );

                        // Disable buttons after decision.
                        await interaction.message.edit({
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(

                                        new ButtonBuilder()
                                            .setCustomId(
                                                "enrol_decision_complete"
                                            )
                                            .setLabel(
                                                "Approved"
                                            )
                                            .setStyle(
                                                ButtonStyle.Success
                                            )
                                            .setDisabled(
                                                true
                                            )

                                    )
                            ]
                        });

                        await interaction.channel.send({
                            embeds: [
                                createEmbed(
                                    "Enrolment Approved",
                                    `This enrolment has been approved by ${interaction.user}.\n\n` +
                                    `The clean school announcement has been sent to the configured enrolment channel.`
                                )
                            ]
                        });

                    } catch (error) {

                        console.error(
                            "Approval error:",
                            error
                        );

                        return interaction.followUp({
                            content:
                                "The approval could not be completed.",
                            ephemeral: true
                        });

                    }

                    return;

                }

                // ==================================================
                // DENY
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "enrol_deny_"
                    )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "You do not have permission to deny enrolments.",
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
                            .setTitle(
                                "Deny School Enrolment"
                            );

                    const reason =
                        new TextInputBuilder()
                            .setCustomId(
                                "reason"
                            )
                            .setLabel(
                                "Reason for denial"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(
                                true
                            )
                            .setMaxLength(
                                1000
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                reason
                            )
                    );

                    return interaction.showModal(
                        modal
                    );

                }

                // ==================================================
                // TICKET CREATE
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_create"
                ) {

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    const guildConfig =
                        config[
                            interaction.guild.id
                        ] || {};

                    const staffRole =
                        guildConfig.ticketStaffRoleId
                            ? interaction.guild
                                .roles
                                .cache.get(
                                    guildConfig.ticketStaffRoleId
                                )
                            : null;

                    const category =
                        guildConfig.ticketCategoryId
                            ? interaction.guild
                                .channels
                                .cache.get(
                                    guildConfig.ticketCategoryId
                                )
                            : null;

                    if (!staffRole) {

                        return interaction.editReply({
                            content:
                                "The ticket staff role has not been configured. An administrator needs to use `/ticketconfig`."
                        });

                    }

                    const existing =
                        interaction.guild.channels.cache.find(
                            channel =>
                                channel.name ===
                                `ticket-${interaction.user.id}`
                        );

                    if (existing) {

                        return interaction.editReply({
                            content:
                                `You already have an open ticket: ${existing}`
                        });

                    }

                    const channel =
                        await interaction.guild
                            .channels
                            .create({
                                name:
                                    `ticket-${interaction.user.id}`,
                                type:
                                    ChannelType.GuildText,
                                parent:
                                    category?.type ===
                                    ChannelType.GuildCategory
                                        ? category.id
                                        : undefined,
                                permissionOverwrites: [

                                    {
                                        id:
                                            interaction.guild
                                                .roles
                                                .everyone.id,
                                        deny: [
                                            PermissionFlagsBits.ViewChannel
                                        ]
                                    },

                                    {
                                        id:
                                            interaction.user.id,
                                        allow: [
                                            PermissionFlagsBits.ViewChannel,
                                            PermissionFlagsBits.SendMessages,
                                            PermissionFlagsBits.ReadMessageHistory
                                        ]
                                    },

                                    {
                                        id:
                                            staffRole.id,
                                        allow: [
                                            PermissionFlagsBits.ViewChannel,
                                            PermissionFlagsBits.SendMessages,
                                            PermissionFlagsBits.ReadMessageHistory,
                                            PermissionFlagsBits.ManageMessages
                                        ]
                                    },

                                    {
                                        id:
                                            client.user.id,
                                        allow: [
                                            PermissionFlagsBits.ViewChannel,
                                            PermissionFlagsBits.SendMessages,
                                            PermissionFlagsBits.ReadMessageHistory,
                                            PermissionFlagsBits.ManageChannels
                                        ]
                                    }

                                ]
                            });

                    const closeButton =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "ticket_close"
                                    )
                                    .setLabel(
                                        "Close Ticket"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )
                            );

                    await channel.send({
                        content:
                            `${staffRole} ${interaction.user}`,
                        embeds: [
                            createEmbed(
                                "Support Ticket",
                                `Welcome ${interaction.user}.\n\n` +
                                "Please explain your enquiry and a member of the RSA team will assist you."
                            )
                        ],
                        components: [
                            closeButton
                        ]
                    });

                    return interaction.editReply({
                        content:
                            `Your ticket has been created: ${channel}`
                    });

                }

                // ==================================================
                // TICKET CLOSE
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_close"
                ) {

                    const guildConfig =
                        config[
                            interaction.guild.id
                        ] || {};

                    const staffRole =
                        guildConfig.ticketStaffRoleId
                            ? interaction.guild
                                .roles
                                .cache.get(
                                    guildConfig.ticketStaffRoleId
                                )
                            : null;

                    if (
                        !staffRole ||
                        !interaction.member.roles.cache.has(
                            staffRole.id
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "Only ticket staff can close this ticket.",
                            ephemeral: true
                        });

                    }

                    await interaction.reply({
                        embeds: [
                            createEmbed(
                                "Ticket Closing",
                                "This ticket will be deleted in 5 seconds."
                            )
                        ]
                    });

                    setTimeout(
                        () => {
                            interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                );
                        },
                        5000
                    );

                    return;

                }

                // ==================================================
                // ENROLMENT CONFIG BUTTONS
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "enrolcfg_"
                    )
                ) {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });

                    }

                    // ------------------------------
                    // REFRESH
                    // ------------------------------

                    if (
                        interaction.customId ===
                        "enrolcfg_refresh"
                    ) {

                        return interaction.update({
                            embeds: [
                                buildEnrolConfigEmbed(
                                    interaction.guild
                                )
                            ],
                            components:
                                enrolConfigComponents()
                        });

                    }

                    // ------------------------------
                    // STAFF ROLE
                    // ------------------------------

                    if (
                        interaction.customId ===
                        "enrolcfg_staff"
                    ) {

                        const roles =
                            interaction.guild.roles.cache
                                .filter(
                                    role =>
                                        role.id !==
                                        interaction.guild.id
                                )
                                .sort(
                                    (a, b) =>
                                        b.position -
                                        a.position
                                )
                                .first(
                                    25
                                );

                        if (!roles.length) {

                            return interaction.reply({
                                content:
                                    "No roles are available.",
                                ephemeral: true
                            });

                        }

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "enrolcfg_select_staff"
                                )
                                .setPlaceholder(
                                    "Select the RSA staff role"
                                )
                                .addOptions(
                                    roles.map(
                                        role => ({
                                            label:
                                                role.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                role.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the role that should be allowed to review school enrolments.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });

                    }

                    // ------------------------------
                    // APPROVED ROLE
                    // ------------------------------

                    if (
                        interaction.customId ===
                        "enrolcfg_approved"
                    ) {

                        const roles =
                            interaction.guild.roles.cache
                                .filter(
                                    role =>
                                        role.id !==
                                        interaction.guild.id
                                )
                                .sort(
                                    (a, b) =>
                                        b.position -
                                        a.position
                                )
                                .first(
                                    25
                                );

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "enrolcfg_select_approved"
                                )
                                .setPlaceholder(
                                    "Select approved school role"
                                )
                                .addOptions(
                                    roles.map(
                                        role => ({
                                            label:
                                                role.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                role.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the role that should be given to an approved school.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });

                    }

                    // ------------------------------
                    // ENROLMENT CHANNEL
                    // ------------------------------

                    if (
                        interaction.customId ===
                        "enrolcfg_channel"
                    ) {

                        const channels =
                            interaction.guild.channels.cache
                                .filter(
                                    channel =>
                                        channel.type ===
                                        ChannelType.GuildText
                                )
                                .first(
                                    25
                                );

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "enrolcfg_select_channel"
                                )
                                .setPlaceholder(
                                    "Select the enrolment channel"
                                )
                                .addOptions(
                                    channels.map(
                                        channel => ({
                                            label:
                                                channel.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                channel.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select where clean approved-school announcements should be posted.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });

                    }

                    // ------------------------------
                    // REVIEW CATEGORY
                    // ------------------------------

                    if (
                        interaction.customId ===
                        "enrolcfg_category"
                    ) {

                        const categories =
                            interaction.guild.channels.cache
                                .filter(
                                    channel =>
                                        channel.type ===
                                        ChannelType.GuildCategory
                                )
                                .first(
                                    25
                                );

                        if (!categories.length) {

                            return interaction.reply({
                                content:
                                    "There are no categories available.",
                                ephemeral: true
                            });

                        }

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "enrolcfg_select_category"
                                )
                                .setPlaceholder(
                                    "Select review category"
                                )
                                .addOptions(
                                    categories.map(
                                        category => ({
                                            label:
                                                category.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                category.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the category where automatic staff-only review channels should be created.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });

                    }

                }

                // ==================================================
                // TICKET CONFIG BUTTONS
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "ticketcfg_"
                    )
                ) {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });

                    }

                    // ------------------------------
                    // SEND PANEL
                    // ------------------------------

                    if (
                        interaction.customId ===
                        "ticketcfg_send"
                    ) {

                        await interaction.channel.send(
                            ticketPanel()
                        );

                        return interaction.reply({
                            content:
                                "The ticket panel has been sent.",
                            ephemeral: true
                        });

                    }

                    // ------------------------------
                    // STAFF ROLE
                    // ------------------------------

                    if (
                        interaction.customId ===
                        "ticketcfg_staff"
                    ) {

                        const roles =
                            interaction.guild.roles.cache
                                .filter(
                                    role =>
                                        role.id !==
                                        interaction.guild.id
                                )
                                .sort(
                                    (a, b) =>
                                        b.position -
                                        a.position
                                )
                                .first(
                                    25
                                );

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "ticketcfg_select_staff"
                                )
                                .setPlaceholder(
                                    "Select ticket staff role"
                                )
                                .addOptions(
                                    roles.map(
                                        role => ({
                                            label:
                                                role.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                role.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the role that should have access to tickets.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });

                    }

                    // ------------------------------
                    // CATEGORY
                    // ------------------------------

                    if (
                        interaction.customId ===
                        "ticketcfg_category"
                    ) {

                        const categories =
                            interaction.guild.channels.cache
                                .filter(
                                    channel =>
                                        channel.type ===
                                        ChannelType.GuildCategory
                                )
                                .first(
                                    25
                                );

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "ticketcfg_select_category"
                                )
                                .setPlaceholder(
                                    "Select ticket category"
                                )
                                .addOptions(
                                    categories.map(
                                        category => ({
                                            label:
                                                category.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                category.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the category where tickets should be created.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });

                    }

                }

            }

            // ====================================================
            // SELECT MENUS
            // ====================================================

            if (
                interaction.isStringSelectMenu()
            ) {

                // ==================================================
                // EDIT QUESTION
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_edit_question"
                ) {

                    const session =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!session) {

                        return interaction.reply({
                            content:
                                "Your questionnaire has expired.",
                            ephemeral: true
                        });

                    }

                    const questionId =
                        interaction.values[0];

                    const question =
                        enrolQuestions.find(
                            item =>
                                item.id ===
                                questionId
                        );

                    if (!question) {

                        return interaction.reply({
                            content:
                                "That question could not be found.",
                            ephemeral: true
                        });

                    }

                    return interaction.showModal(
                        createEditModal(
                            question,
                            session.answers[
                                question.id
                            ]
                        )
                    );

                }

                // ==================================================
                // ENROL STAFF ROLE
                // ==================================================

                if (
                    interaction.customId ===
                    "enrolcfg_select_staff"
                ) {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) return;

                    if (
                        !config[
                            interaction.guild.id
                        ]
                    ) {
                        config[
                            interaction.guild.id
                        ] = {};
                    }

                    config[
                        interaction.guild.id
                    ].enrolStaffRoleId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const role =
                        interaction.guild.roles.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `RSA enrolment staff role set to ${role}.`,
                        components: []
                    });

                }

                // ==================================================
                // ENROL APPROVED ROLE
                // ==================================================

                if (
                    interaction.customId ===
                    "enrolcfg_select_approved"
                ) {

                    if (
                        !config[
                            interaction.guild.id
                        ]
                    ) {
                        config[
                            interaction.guild.id
                        ] = {};
                    }

                    config[
                        interaction.guild.id
                    ].enrolApprovedRoleId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const role =
                        interaction.guild.roles.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Approved school role set to ${role}.`,
                        components: []
                    });

                }

                // ==================================================
                // ENROL CHANNEL
                // ==================================================

                if (
                    interaction.customId ===
                    "enrolcfg_select_channel"
                ) {

                    if (
                        !config[
                            interaction.guild.id
                        ]
                    ) {
                        config[
                            interaction.guild.id
                        ] = {};
                    }

                    config[
                        interaction.guild.id
                    ].enrolChannelId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const channel =
                        interaction.guild.channels.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Approved-school announcements will now be sent to ${channel}.`,
                        components: []
                    });

                }

                // ==================================================
                // ENROL REVIEW CATEGORY
                // ==================================================

                if (
                    interaction.customId ===
                    "enrolcfg_select_category"
                ) {

                    if (
                        !config[
                            interaction.guild.id
                        ]
                    ) {
                        config[
                            interaction.guild.id
                        ] = {};
                    }

                    config[
                        interaction.guild.id
                    ].enrolReviewCategoryId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const category =
                        interaction.guild.channels.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Enrolment review category set to **${category?.name || "Unknown"}**.`,
                        components: []
                    });

                }

                // ==================================================
                // TICKET STAFF
                // ==================================================

                if (
                    interaction.customId ===
                    "ticketcfg_select_staff"
                ) {

                    if (
                        !config[
                            interaction.guild.id
                        ]
                    ) {
                        config[
                            interaction.guild.id
                        ] = {};
                    }

                    config[
                        interaction.guild.id
                    ].ticketStaffRoleId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const role =
                        interaction.guild.roles.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Ticket staff role set to ${role}.`,
                        components: []
                    });

                }

                // ==================================================
                // TICKET CATEGORY
                // ==================================================

                if (
                    interaction.customId ===
                    "ticketcfg_select_category"
                ) {

                    if (
                        !config[
                            interaction.guild.id
                        ]
                    ) {
                        config[
                            interaction.guild.id
                        ] = {};
                    }

                    config[
                        interaction.guild.id
                    ].ticketCategoryId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const category =
                        interaction.guild.channels.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Ticket category set to **${category?.name || "Unknown"}**.`,
                        components: []
                    });

                }

            }

            // ====================================================
            // MODALS
            // ====================================================

            if (
                interaction.isModalSubmit()
            ) {

                // ==================================================
                // EDIT QUESTION
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "enrol_edit_modal_"
                    )
                ) {

                    const questionId =
                        interaction.customId.replace(
                            "enrol_edit_modal_",
                            ""
                        );

                    const session =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!session) {

                        return interaction.reply({
                            content:
                                "Your questionnaire has expired.",
                            ephemeral: true
                        });

                    }

                    const question =
                        enrolQuestions.find(
                            item =>
                                item.id ===
                                questionId
                        );

                    if (!question) {

                        return interaction.reply({
                            content:
                                "Question not found.",
                            ephemeral: true
                        });

                    }

                    const answer =
                        interaction.fields.getTextInputValue(
                            "answer"
                        );

                    session.answers[
                        questionId
                    ] = answer;

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Answer Updated",
                                "Your answer has been updated."
                            )
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(

                                    new ButtonBuilder()
                                        .setCustomId(
                                            "enrol_review_again"
                                        )
                                        .setLabel(
                                            "Review Enrolment"
                                        )
                                        .setStyle(
                                            ButtonStyle.Primary
                                        )

                                )
                        ]
                    });

                }

                // ==================================================
                // DENIAL
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "enrol_deny_modal_"
                    )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "You do not have permission to do this.",
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
                            "reason"
                        );

                    const applicant =
                        await interaction.guild
                            .members
                            .fetch(
                                applicantId
                            )
                            .catch(
                                () => null
                            );

                    if (applicant) {

                        await applicant.user.send({
                            embeds: [
                                createEmbed(
                                    "School Enrolment Denied",
                                    `Your school enrolment in **${interaction.guild.name}** has been denied.\n\n**Reason:** ${reason}`
                                )
                            ]
                        }).catch(
                            () => {}
                        );

                    }

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Enrolment Denied",
                                `This enrolment has been denied by ${interaction.user}.\n\n**Reason:** ${reason}`
                            )
                        ]
                    });

                    await interaction.message.edit({
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "enrol_decision_denied"
                                        )
                                        .setLabel(
                                            "Denied"
                                        )
                                        .setStyle(
                                            ButtonStyle.Danger
                                        )
                                        .setDisabled(
                                            true
                                        )
                                )
                        ]
                    }).catch(
                        () => {}
                    );

                    return interaction.reply({
                        content:
                            "The enrolment has been denied.",
                        ephemeral: true
                    });

                }

            }

        } catch (error) {

            console.error(
                "INTERACTION ERROR:",
                error
            );

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({
                        content:
                            "Something went wrong while processing that action.",
                        ephemeral: true
                    });

                } else {

                    await interaction.reply({
                        content:
                            "Something went wrong while processing that action.",
                        ephemeral: true
                    });

                }

            } catch (
                responseError
            ) {

                console.error(
                    "Could not respond:",
                    responseError
                );

            }

        }

    }
);

// ============================================================
// REVIEW AGAIN BUTTON
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        if (
            !interaction.isButton()
        ) return;

        if (
            interaction.customId !==
            "enrol_review_again"
        ) return;

        try {

            return interaction.update({
                embeds: [],
                components: []
            }).then(
                () =>
                    showEnrolmentReview(
                        interaction.user
                    )
            );

        } catch (error) {

            console.error(
                "Review again error:",
                error
            );

        }

    }
);

// ============================================================
// CLEAN EXPIRED QUESTIONNAIRES
// ============================================================

setInterval(
    () => {

        const now =
            Date.now();

        for (
            const [
                userId,
                session
            ]
            of enrolments.entries()
        ) {

            if (
                now -
                session.createdAt >
                60 * 60 * 1000
            ) {

                enrolments.delete(
                    userId
                );

            }

        }

    },
    10 * 60 * 1000
);

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
