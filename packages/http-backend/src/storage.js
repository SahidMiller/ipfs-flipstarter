module.exports = function (app) {
  //
  app.debug.struct("Initializing storage module.");

  // Enable support for sqlite databases.
  const Database = require("better-sqlite3");

  // Enable support for filesystem operations.
  const Filesystem = require("fs");
  const path = require("path")

  // Open the database in read-write mode.
  app.sql = new Database(app.config.server.database, {
    memory: false,
    readonly: false,
  });

  //
  app.debug.struct("Created database connection.");

  // Configure database behaviour.
  {
    // Enable support for foreign keys.
    app.sql.pragma("foreign_keys = ON");

    // To avoid risk of database corruption, always wait for filesystem.
    app.sql.pragma("synchronous = ON");

    // Allow the database to lock the database file on the operating system level.
    app.sql.pragma("locking_mode = EXCLUSIVE");

    // Allow the database to keep the journal file when not in use, to prevent re-creating it repeatedly.
    app.sql.pragma("journal_mode = TRUNCATE");
  }

  //
  app.debug.struct("Configured database connection.");
  
  const basePath = path.join(__dirname, "../")

  // Initialize the database
  {
    // Load the database schema.
    const databaseSchema = Filesystem.readFileSync(
      path.join(basePath, "sql/database_schema.sql"),
      "utf8"
    ).trim();

    // Create the database schema.
    app.sql.exec(databaseSchema);
  }

  // Load the database queries.
  app.queries = {
    // User management.
    addUser: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/add_user.sql"), "utf8").trim()
    ),
    getUser: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/get_user.sql"), "utf8").trim()
    ),
    getUserByAddress: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/get_user_by_address.sql"), "utf8").trim()
    ),
    listCampaignsByUser: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/list_campaigns_by_user.sql"), "utf8").trim()
    ),
    listContributionsByUser: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/list_contributions_by_user.sql"),
        "utf8"
      ).trim()
    ),
    listRecipientsByUser: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/list_recipients_by_user.sql"), "utf8").trim()
    ),

    // Commitment management.
    addCommitment: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/add_commitment.sql"), "utf8").trim()
    ),
    getCommitment: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/get_commitment.sql"), "utf8").trim()
    ),
    getCommitmentsByAddress: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/get_commitments_by_address.sql"), "utf8").trim()
    ),
    getCommitmentByHashAndIndex: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/get_commitment_by_hash_and_index.sql"),
        "utf8"
      ).trim()
    ),
    getContribution: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/get_contribution.sql"), "utf8").trim()
    ),
    countCommitmentsByCampaign: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/count_commitments_by_campaign.sql"),
        "utf8"
      ).trim()
    ),
    //
    getContributionByCommitment: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/get_contribution_by_commitment.sql"),
        "utf8"
      ).trim()
    ),
    listAllContributions: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/list_all_contributions.sql"), "utf8").trim()
    ),

    // Campaign management.
    getCampaign: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/get_campaign.sql"), "utf8").trim()
    ),
    addCampaign: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/add_campaign.sql"), "utf8").trim()
    ),
    getCampaignRequestedSatoshis: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/get_campaign_requested_satoshis.sql"),
        "utf8"
      ).trim()
    ),
    getCampaignCommittedSatoshis: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/get_campaign_committed_satoshis.sql"),
        "utf8"
      ).trim()
    ),
    listCampaigns: app.sql.prepare(
      Filesystem.readFileSync(path.join(basePath, "sql/list_campaigns.sql"), "utf8").trim()
    ),
    listRecipientsByCampaign: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/list_recipients_by_campaign.sql"),
        "utf8"
      ).trim()
    ),
    listContributionsByCampaign: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/list_contributions_by_campaign.sql"),
        "utf8"
      ).trim()
    ),
    addRecipientToCampaign: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/add_recipient_to_campaign.sql"),
        "utf8"
      ).trim()
    ),
    addContributionToCampaign: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/add_contribution_to_campaign.sql"),
        "utf8"
      ).trim()
    ),
    addContributionRevocation: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/add_contribution_revocation.sql"),
        "utf8"
      ).trim()
    ),
    addCampaignFullfillment: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/add_campaign_fullfillment.sql"),
        "utf8"
      ).trim()
    ),
    linkCommitmentToContribution: app.sql.prepare(
      Filesystem.readFileSync(
        path.join(basePath, "sql/link_commitment_to_contribution.sql"),
        "utf8"
      ).trim()
    ),
  };

  // Apply the database content.
  const campaign = app.queries.getCampaign.get({ campaign_id: 1 });
  
  // Notify that this is a fresh install and needs a campaign
  app.freshInstall = typeof campaign === "undefined"

  // TODO God willing: initialize with json rather than UI.
  if (app.freshInstall && app.config.initialCampaignJsonPath) {

    try {
      
      console.log("Processessing campaign.json", app.config.initialCampaignJsonPath)

      const campaignData = JSON.parse(Filesystem.readFileSync(app.config.initialCampaignJsonPath))
      const hasData = !!campaignData && !isNaN(Number(campaignData.starts)) && !isNaN(Number(campaignData.expires))
      const hasRecipients = hasData && campaignData.recipients && campaignData.recipients.length && campaignData.recipients.every(r => {
        //TODO God willing: validate addresses and satoshis (more than dust)
        return r.address && r.satoshis
      })

      if (!hasData || !hasRecipients) {
        throw "Invalid campaign data"
      }

      // Actually initialize the campaign with the POST data
      const getDescriptionLanguage = (code) => {
        const description = campaignData.descriptions && campaignData.descriptions[code] || {}
        return {
          abstract: description.abstract || "",
          proposal: description.proposal || ""
        }
      }

      const { abstract = "", proposal = "" } = getDescriptionLanguage("en")
      const { abstractES = "", proposalES = "" } = getDescriptionLanguage("es")
      const { abstractZH = "", proposalZH = "" } = getDescriptionLanguage("zh")
      const { abstractJA = "", proposalJA = "" } = getDescriptionLanguage("ja")

      const createCampaignResult = app.queries.addCampaign.run({
        title: campaignData.title,
        starts: Number(campaignData.starts),
        expires: Number(campaignData.expires),
        abstract,
        proposal,
        abstractJA,
        proposalJA,
        abstractES,
        proposalES,
        abstractZH,
        proposalZH
      });

      campaignData.recipients.forEach((recipient, i) => {
        const addUserResult = app.queries.addUser.run({
          user_url: recipient.url,
          user_image: recipient.image,
          user_alias: recipient.name,
          user_address: recipient.address,
          data_signature: null,
        });

        app.queries.addRecipientToCampaign.run({
          user_id: addUserResult.lastInsertRowid,
          campaign_id: createCampaignResult.lastInsertRowid,
          recipient_satoshis: parseInt(recipient.satoshis)
        });
      })

      app.freshInstall = false;

    } catch (err) {

      console.log("Error processessing campaign.json", err)
    }
  }

  //
  app.debug.struct("Applied database table schema.");

  //
  app.debug.struct("Prepared database queries from disk.");

  // Close the database on application exit.
  process.on("beforeExit", app.sql.close);

  //
  app.debug.status("Completed storage initialization.");
};
