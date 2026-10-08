require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    REST,
    Routes
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const EMBED_COLOR = "#E75D2A";

// =====================================================
// EMBED
// =====================================================

function embed(title, description) {
    return new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(title)
        .setDescription(description);
}

// =====================================================
// COMMANDS
// =====================================================

const commands = [

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Permanently ban a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member to ban.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the ban.")
        ),

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user.")
        .addStringOption(o =>
            o.setName("userid")
                .setDescription("The user's ID.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Remove a member from the server.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member to kick.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the kick.")
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member to timeout.")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("minutes")
                .setDescription("Timeout duration.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the timeout.")
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a member's timeout.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the warning.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View a member's warnings.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear a member's warnings.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Delete multiple messages.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Number of messages.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete recent messages.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Number of messages.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set channel slowmode.")
        .addIntegerOption(o =>
            o.setName("seconds")
                .setDescription("Slowmode duration.")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the current channel."),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the current channel."),

    new SlashCommandBuilder()
        .setName("lockdown")
        .setDescription("Lock configured server channels."),

    new SlashCommandBuilder()
        .setName("unlockdown")
        .setDescription("End the server lockdown."),

    new SlashCommandBuilder()
        .setName("automodconfig")
        .setDescription("Configure Ghosty's AutoMod."),

    new SlashCommandBuilder()
        .setName("logs")
        .setDescription("Configure Ghosty's logging."),

    new SlashCommandBuilder()
        .setName("logsstatus")
        .setDescription("View logging settings."),

    new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Set up Ghosty."),

    new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Manage Ghosty's settings."),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View member information.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View server information."),

    new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("View role information.")
        .addRoleOption(o =>
            o.setName("role")
                .setDescription("The role.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("channelinfo")
        .setDescription("View channel information."),

    new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("View a member's avatar.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
        ),

    new SlashCommandBuilder()
        .setName("banner")
        .setDescription("View a member's banner.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
        ),

    new SlashCommandBuilder()
        .setName("staff")
        .setDescription("Open the staff panel."),

    new SlashCommandBuilder()
        .setName("modstats")
        .setDescription("View moderation statistics."),

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("View Ghosty's commands."),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check Ghosty's latency."),

    new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("View Ghosty's uptime."),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("View information about Ghosty."),

    new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Get Ghosty's invite link."),

    new SlashCommandBuilder()
        .setName("support")
        .setDescription("Get the Ghosty support server.")

].map(command => command.toJSON());

// =====================================================
// REGISTER COMMANDS
// =====================================================

async function registerCommands() {
    try {
        console.log("Registering Ghosty commands...");

        // Gets the bot's application information using the token.
        const application = await client.application.fetch();

        const rest = new REST({ version: "10" })
            .setToken(process.env.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationCommands(application.id),
            {
                body: commands
            }
        );

        console.log(`Successfully registered ${commands.length} commands.`);
    } catch (error) {
        console.error("Failed to register commands:", error);
    }
}

// =====================================================
// READY
// =====================================================

client.once("ready", async () => {

    console.log(`Ghosty is online as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} server(s).`);

    await registerCommands();

});

// =====================================================
// INTERACTIONS
// =====================================================

client.on("interactionCreate", async interaction => {

    try {

        if (interaction.isChatInputCommand()) {
            await handleCommand(interaction);
        }

        if (interaction.isButton()) {
            await handleButton(interaction);
        }

    } catch (error) {

        console.error(error);

        const response = {
            embeds: [
                embed(
                    "Something Went Wrong",
                    "Ghosty could not complete that action."
                )
            ],
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response).catch(() => {});
        } else {
            await interaction.reply(response).catch(() => {});
        }

    }

});

// =====================================================
// COMMAND HANDLER
// =====================================================

async function handleCommand(interaction) {

    const command = interaction.commandName;

    // BAN
    if (command === "ban") {

        if (!interaction.memberPermissions.has(
            PermissionsBitField.Flags.BanMembers
        )) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Permission Denied",
                        "You need the Ban Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.bannable) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Unable to Ban",
                        "Ghosty cannot ban that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.ban({ reason });

        return interaction.reply({
            embeds: [
                embed(
                    "Member Banned",
                    `**User:** ${user}\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    // KICK
    if (command === "kick") {

        if (!interaction.memberPermissions.has(
            PermissionsBitField.Flags.KickMembers
        )) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Permission Denied",
                        "You need the Kick Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.kickable) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Unable to Kick",
                        "Ghosty cannot kick that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.kick(reason);

        return interaction.reply({
            embeds: [
                embed(
                    "Member Kicked",
                    `**User:** ${user}\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    // TIMEOUT
    if (command === "timeout") {

        if (!interaction.memberPermissions.has(
            PermissionsBitField.Flags.ModerateMembers
        )) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Permission Denied",
                        "You need the Moderate Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const minutes = interaction.options.getInteger("minutes");
        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.moderatable) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Unable to Timeout",
                        "Ghosty cannot timeout that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.timeout(
            minutes * 60 * 1000,
            reason
        );

        return interaction.reply({
            embeds: [
                embed(
                    "Member Timed Out",
                    `**User:** ${user}\n**Duration:** ${minutes} minute(s)\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    // UNTIMEOUT
    if (command === "untimeout") {

        if (!interaction.memberPermissions.has(
            PermissionsBitField.Flags.ModerateMembers
        )) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Permission Denied",
                        "You need the Moderate Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.moderatable) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Unable to Remove Timeout",
                        "Ghosty cannot modify that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.timeout(null);

        return interaction.reply({
            embeds: [
                embed(
                    "Timeout Removed",
                    `The timeout has been removed from **${user}**.`
                )
            ],
            ephemeral: true
        });
    }

    // WARN
    if (command === "warn") {

        if (!interaction.memberPermissions.has(
            PermissionsBitField.Flags.ModerateMembers
        )) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Permission Denied",
                        "You need the Moderate Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");

        return interaction.reply({
            embeds: [
                embed(
                    "Member Warned",
                    `**User:** ${user}\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    // AUTOMOD CONFIG
    if (command === "automodconfig") {

        if (!interaction.memberPermissions.has(
            PermissionsBitField.Flags.ManageGuild
        )) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Permission Denied",
                        "You need the Manage Server permission to configure AutoMod."
                    )
                ],
                ephemeral: true
            });
        }

        const panel = embed(
            "Ghosty AutoMod",
            "**Status:** Disabled\n\n" +
            "**Spam Protection:** Enabled\n" +
            "**Mention Protection:** Enabled\n" +
            "**Invite Protection:** Enabled\n" +
            "**Word Filter:** Enabled\n" +
            "**Excessive Caps:** Disabled"
        );

        const row = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("automod_enable")
                .setLabel("Enable")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("automod_configure")
                .setLabel("Configure")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("automod_logs")
                .setLabel("Logs")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("automod_disable")
                .setLabel("Disable")
                .setStyle(ButtonStyle.Danger)

        );

        return interaction.reply({
            embeds: [panel],
            components: [row],
            ephemeral: true
        });
    }

    // PING
    if (command === "ping") {

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Ping",
                    `Latency: **${client.ws.ping}ms**`
                )
            ],
            ephemeral: true
        });
    }

    // UPTIME
    if (command === "uptime") {

        const totalSeconds = Math.floor(process.uptime());

        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(
            (totalSeconds % 86400) / 3600
        );
        const minutes = Math.floor(
            (totalSeconds % 3600) / 60
        );

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Uptime",
                    `${days}d ${hours}h ${minutes}m`
                )
            ],
            ephemeral: true
        });
    }

    // BOT INFO
    if (command === "botinfo") {

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty",
                    "Ghosty is a Discord moderation bot."
                )
            ],
            ephemeral: true
        });
    }

    // HELP
    if (command === "help") {

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Commands",
                    "**Moderation**\n" +
                    "`/ban` `/unban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings`\n\n" +

                    "**Messages and Channels**\n" +
                    "`/clear` `/purge` `/slowmode` `/lock` `/unlock` `/lockdown` `/unlockdown`\n\n" +

                    "**AutoMod**\n" +
                    "`/automodconfig`\n\n" +

                    "**Configuration**\n" +
                    "`/setup` `/settings` `/logs` `/logsstatus`\n\n" +

                    "**Information**\n" +
                    "`/userinfo` `/serverinfo` `/roleinfo` `/channelinfo` `/avatar` `/banner`\n\n" +

                    "**Staff**\n" +
                    "`/staff` `/modstats`\n\n" +

                    "**Utility**\n" +
                    "`/help` `/ping` `/uptime` `/botinfo` `/invite` `/support`"
                )
            ],
            ephemeral: true
        });
    }

    // OTHER COMMANDS
    return interaction.reply({
        embeds: [
            embed(
                "Coming Soon",
                "This Ghosty feature has been registered and will be implemented soon."
            )
        ],
        ephemeral: true
    });
}

// =====================================================
// BUTTON HANDLER
// =====================================================

async function handleButton(interaction) {

    if (!interaction.customId.startsWith("automod_")) {
        return;
    }

    if (!interaction.memberPermissions.has(
        PermissionsBitField.Flags.ManageGuild
    )) {
        return interaction.reply({
            embeds: [
                embed(
                    "Permission Denied",
                    "You need the Manage Server permission to configure AutoMod."
                )
            ],
            ephemeral: true
        });
    }

    if (interaction.customId === "automod_enable") {

        return interaction.update({
            embeds: [
                embed(
                    "Ghosty AutoMod",
                    "**Status:** Enabled\n\n" +
                    "**Spam Protection:** Enabled\n" +
                    "**Mention Protection:** Enabled\n" +
                    "**Invite Protection:** Enabled\n" +
                    "**Word Filter:** Enabled\n" +
                    "**Excessive Caps:** Disabled"
                )
            ]
        });
    }

    if (interaction.customId === "automod_disable") {

        return interaction.update({
            embeds: [
                embed(
                    "Ghosty AutoMod",
                    "**Status:** Disabled"
                )
            ]
        });
    }

    if (interaction.customId === "automod_configure") {

        const row = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("automod_spam")
                .setLabel("Spam")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("automod_mentions")
                .setLabel("Mentions")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("automod_invites")
                .setLabel("Invites")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("automod_words")
                .setLabel("Word Filter")
                .setStyle(ButtonStyle.Secondary)

        );

        return interaction.update({
            embeds: [
                embed(
                    "AutoMod Configuration",
                    "Select the AutoMod feature you want to configure."
                )
            ],
            components: [row]
        });
    }

    if (interaction.customId === "automod_logs") {

        return interaction.reply({
            embeds: [
                embed(
                    "AutoMod Logs",
                    "AutoMod logging configuration will be available here."
                )
            ],
            ephemeral: true
        });
    }
}

// =====================================================
// LOGIN
// =====================================================

if (!process.env.DISCORD_TOKEN) {

    console.error(
        "DISCORD_TOKEN is missing from environment variables."
    );

    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
