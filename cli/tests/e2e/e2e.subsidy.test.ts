import { genRandomSalt } from "maci-crypto";
import { Keypair } from "maci-domainobjs";

import {
  checkVerifyingKeys,
  deploy,
  deployPoll,
  deployVkRegistryContract,
  genProofs,
  mergeMessages,
  mergeSignups,
  proveOnChain,
  publish,
  setVerifyingKeys,
  signup,
  timeTravel,
  verify,
} from "../../ts/commands";
import { DeployedContracts, GenProofsArgs, PollContracts } from "../../ts/utils";
import {
  coordinatorPrivKey,
  pollDuration,
  verifyArgs,
  proveOnChainArgs,
  processMessageTestZkeyPath,
  subsidyTestZkeyPath,
  checkVerifyingKeysArgs,
  mergeMessagesArgs,
  mergeSignupsArgs,
  tallyVotesTestZkeyPath,
  testProcessMessagesWasmPath,
  testProcessMessagesWitnessDatPath,
  testProcessMessagesWitnessPath,
  testProofsDirPath,
  testRapidsnarkPath,
  testSubsidyFilePath,
  testSubsidyWasmPath,
  testSubsidyWitnessDatPath,
  testSubsidyWitnessPath,
  testTallyFilePath,
  testTallyVotesWasmPath,
  testTallyVotesWitnessDatPath,
  testTallyVotesWitnessPath,
  setVerifyingKeysArgs,
  deployArgs,
  deployPollArgs,
} from "../constants";
import { cleanSubsidy, isArm } from "../utils";

describe("e2e with Subsidy tests", function test() {
  const useWasm = isArm();
  this.timeout(900000);

  let maciAddresses: DeployedContracts;
  let pollAddresses: PollContracts;
  let vkRegistryContractAddress: string;

  const subsidyEnabled = true;
  deployPollArgs.subsidyEnabled = subsidyEnabled;

  const genProofsArgs: GenProofsArgs = {
    outputDir: testProofsDirPath,
    tallyFile: testTallyFilePath,
    tallyZkey: tallyVotesTestZkeyPath,
    processZkey: processMessageTestZkeyPath,
    pollId: 0,
    rapidsnark: testRapidsnarkPath,
    processWitgen: testProcessMessagesWitnessPath,
    processDatFile: testProcessMessagesWitnessDatPath,
    tallyWitgen: testTallyVotesWitnessPath,
    tallyDatFile: testTallyVotesWitnessDatPath,
    coordinatorPrivKey,
    processWasm: testProcessMessagesWasmPath,
    tallyWasm: testTallyVotesWasmPath,
    useWasm,
    subsidyZkey: subsidyTestZkeyPath,
    subsidyFile: testSubsidyFilePath,
    subsidyWitgen: testSubsidyWitnessPath,
    subsidyDatFile: testSubsidyWitnessDatPath,
    subsidyWasm: testSubsidyWasmPath,
  };

  before(async () => {
    // we deploy the vk registry contract
    vkRegistryContractAddress = await deployVkRegistryContract(true);
    // we set the verifying keys
    await setVerifyingKeys({ ...setVerifyingKeysArgs, subsidyZkeyPath: subsidyTestZkeyPath });
  });

  describe("4 signups, 6 messages", () => {
    after(() => {
      cleanSubsidy();
    });

    const users = [new Keypair(), new Keypair(), new Keypair(), new Keypair()];

    before(async () => {
      // deploy the smart contracts
      maciAddresses = await deploy(deployArgs);
      // deploy a poll contract
      pollAddresses = await deployPoll(deployPollArgs);
    });

    it("should signup four users", async () => {
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < users.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await signup({ maciPubKey: users[i].pubKey.serialize() });
      }
    });

    it("should publish six messages", async () => {
      await publish({
        pubkey: users[0].pubKey.serialize(),
        stateIndex: 1,
        voteOptionIndex: 0,
        nonce: 1,
        pollId: 0,
        newVoteWeight: 9,
        salt: genRandomSalt().toString(),
        privateKey: users[0].privKey.serialize(),
      });

      await publish({
        pubkey: users[1].pubKey.serialize(),
        stateIndex: 2,
        voteOptionIndex: 1,
        nonce: 1,
        pollId: 0,
        newVoteWeight: 9,
        salt: genRandomSalt().toString(),
        privateKey: users[1].privKey.serialize(),
      });

      await publish({
        pubkey: users[2].pubKey.serialize(),
        stateIndex: 3,
        voteOptionIndex: 2,
        nonce: 1,
        pollId: 0,
        newVoteWeight: 9,
        salt: genRandomSalt().toString(),
        privateKey: users[2].privKey.serialize(),
      });

      await publish({
        pubkey: users[3].pubKey.serialize(),
        stateIndex: 4,
        voteOptionIndex: 3,
        nonce: 1,
        pollId: 0,
        newVoteWeight: 9,
        salt: genRandomSalt().toString(),
        privateKey: users[3].privKey.serialize(),
      });

      await publish({
        pubkey: users[3].pubKey.serialize(),
        stateIndex: 4,
        voteOptionIndex: 3,
        nonce: 2,
        pollId: 0,
        newVoteWeight: 9,
        salt: genRandomSalt().toString(),
        privateKey: users[3].privKey.serialize(),
      });

      await publish({
        pubkey: users[3].pubKey.serialize(),
        stateIndex: 4,
        voteOptionIndex: 3,
        nonce: 3,
        pollId: 0,
        newVoteWeight: 9,
        salt: genRandomSalt().toString(),
        privateKey: users[3].privKey.serialize(),
      });
    });

    it("should generate zk-SNARK proofs and verify them", async () => {
      await timeTravel(pollDuration, true);
      await mergeMessages(mergeMessagesArgs);
      await mergeSignups(mergeSignupsArgs);
      await genProofs(genProofsArgs);
      await proveOnChain(proveOnChainArgs);
      await verify(verifyArgs);
    });
  });

  describe("9 signups, 1 message", () => {
    after(() => {
      cleanSubsidy();
    });

    const users = [
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
    ];

    before(async () => {
      // deploy the smart contracts
      maciAddresses = await deploy(deployArgs);
      // deploy a poll contract
      pollAddresses = await deployPoll(deployPollArgs);
    });

    it("should signup nine users", async () => {
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < users.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await signup({ maciPubKey: users[i].pubKey.serialize() });
      }
    });

    it("should publish one message", async () => {
      await publish({
        pubkey: users[0].pubKey.serialize(),
        stateIndex: 1,
        voteOptionIndex: 0,
        nonce: 1,
        pollId: 0,
        newVoteWeight: 9,
        maciContractAddress: maciAddresses.maciAddress,
        salt: genRandomSalt().toString(),
        privateKey: users[0].privKey.serialize(),
      });
    });

    it("should generate zk-SNARK proofs and verify them", async () => {
      await timeTravel(pollDuration, true);
      await mergeMessages(mergeMessagesArgs);
      await mergeSignups(mergeSignupsArgs);
      const tallyData = await genProofs(genProofsArgs);
      await proveOnChain(proveOnChainArgs);
      await verify({ ...verifyArgs, tallyData });
    });
  });

  describe("8 signups (same key), 12 messages (same message)", () => {
    after(() => {
      cleanSubsidy();
    });

    const user = new Keypair();

    before(async () => {
      // deploy the smart contracts
      maciAddresses = await deploy(deployArgs);
      // deploy a poll contract
      pollAddresses = await deployPoll(deployPollArgs);
    });

    it("should signup eight users (same pub key)", async () => {
      for (let i = 0; i < 8; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await signup({ maciPubKey: user.pubKey.serialize() });
      }
    });

    it("should publish 12 messages with the same nonce", async () => {
      for (let i = 0; i < 12; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await publish({
          pubkey: user.pubKey.serialize(),
          stateIndex: 1,
          voteOptionIndex: 0,
          nonce: 1,
          pollId: 0,
          newVoteWeight: 9,
          maciContractAddress: maciAddresses.maciAddress,
          salt: genRandomSalt().toString(),
          privateKey: user.privKey.serialize(),
        });
      }
    });

    it("should generate zk-SNARK proofs and verify them", async () => {
      await timeTravel(pollDuration, true);
      await mergeMessages(mergeMessagesArgs);
      await mergeSignups(mergeSignupsArgs);
      const tallyData = await genProofs(genProofsArgs);
      await proveOnChain(proveOnChainArgs);
      await verify({ ...verifyArgs, tallyData });
    });
  });

  describe("multiplePolls2", () => {
    const users = [
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
      new Keypair(),
    ];

    let secondPollAddresses: PollContracts;

    after(() => {
      cleanSubsidy();
    });

    before(async () => {
      // deploy the smart contracts
      maciAddresses = await deploy(deployArgs);
    });

    it("should run the first poll", async () => {
      // deploy a poll contract
      pollAddresses = await deployPoll(deployPollArgs);
      // signup
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < users.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await signup({ maciPubKey: users[i].pubKey.serialize() });
      }
      // publish
      await publish({
        pubkey: users[0].pubKey.serialize(),
        stateIndex: 1,
        voteOptionIndex: 0,
        nonce: 1,
        pollId: 0,
        newVoteWeight: 9,
        maciContractAddress: maciAddresses.maciAddress,
        salt: genRandomSalt().toString(),
        privateKey: users[0].privKey.serialize(),
      });
      // time travel
      await timeTravel(pollDuration, true);
      // generate proofs
      await mergeMessages(mergeMessagesArgs);
      await mergeSignups(mergeSignupsArgs);
      await genProofs(genProofsArgs);
      await proveOnChain(proveOnChainArgs);
      await verify(verifyArgs);
      cleanSubsidy();
    });

    it("should deploy two more polls", async () => {
      // deploy a poll contract
      pollAddresses = await deployPoll(deployPollArgs);
      secondPollAddresses = await deployPoll(deployPollArgs);
    });

    it("should publish messages to the second poll", async () => {
      await publish({
        pubkey: users[0].pubKey.serialize(),
        stateIndex: 1,
        voteOptionIndex: 0,
        nonce: 1,
        pollId: 1,
        newVoteWeight: 9,
        maciContractAddress: maciAddresses.maciAddress,
        salt: genRandomSalt().toString(),
        privateKey: users[0].privKey.serialize(),
      });

      await publish({
        pubkey: users[1].pubKey.serialize(),
        stateIndex: 2,
        voteOptionIndex: 3,
        nonce: 1,
        pollId: 1,
        newVoteWeight: 1,
        maciContractAddress: maciAddresses.maciAddress,
        salt: genRandomSalt().toString(),
        privateKey: users[1].privKey.serialize(),
      });

      await publish({
        pubkey: users[2].pubKey.serialize(),
        stateIndex: 3,
        voteOptionIndex: 5,
        nonce: 1,
        pollId: 1,
        newVoteWeight: 3,
        maciContractAddress: maciAddresses.maciAddress,
        salt: genRandomSalt().toString(),
        privateKey: users[2].privKey.serialize(),
      });
    });

    it("should publish messages to the third poll", async () => {
      await publish({
        pubkey: users[3].pubKey.serialize(),
        stateIndex: 3,
        voteOptionIndex: 5,
        nonce: 1,
        pollId: 2,
        newVoteWeight: 3,
        maciContractAddress: maciAddresses.maciAddress,
        salt: genRandomSalt().toString(),
        privateKey: users[3].privKey.serialize(),
      });

      await publish({
        pubkey: users[4].pubKey.serialize(),
        stateIndex: 4,
        voteOptionIndex: 7,
        nonce: 1,
        pollId: 2,
        newVoteWeight: 2,
        maciContractAddress: maciAddresses.maciAddress,
        salt: genRandomSalt().toString(),
        privateKey: users[4].privKey.serialize(),
      });

      await publish({
        pubkey: users[5].pubKey.serialize(),
        stateIndex: 5,
        voteOptionIndex: 5,
        nonce: 1,
        pollId: 2,
        newVoteWeight: 9,
        maciContractAddress: maciAddresses.maciAddress,
        salt: genRandomSalt().toString(),
        privateKey: users[5].privKey.serialize(),
      });
    });

    it("should complete the second poll", async () => {
      await timeTravel(pollDuration, true);
      await mergeMessages({ pollId: 1 });
      await mergeSignups({ pollId: 1 });
      const tallyData = await genProofs({
        ...genProofsArgs,
        pollId: 1,
      });
      await proveOnChain({
        ...proveOnChainArgs,
        pollId: "1",
      });
      await verify({
        ...verifyArgs,
        pollId: "1",
        tallyData,
        tallyAddress: pollAddresses.tally,
      });
      cleanSubsidy();
    });

    it("should complete the third poll", async () => {
      await mergeMessages({ pollId: 2 });
      await mergeSignups({ pollId: 2 });
      const tallyData = await genProofs({
        ...genProofsArgs,
        pollId: 2,
      });
      await proveOnChain({
        ...proveOnChainArgs,
        pollId: "2",
      });
      await verify({
        ...verifyArgs,
        pollId: "2",
        tallyData,
        tallyAddress: secondPollAddresses.tally,
      });
    });
  });

  describe("checkKeys", () => {
    before(async () => {
      // deploy maci as we need the address
      await deploy(deployArgs);
    });
    it("should check if the verifying keys have been set correctly", async () => {
      await checkVerifyingKeys({
        ...checkVerifyingKeysArgs,
        vkRegistry: vkRegistryContractAddress,
        subsidyZkeyPath: subsidyTestZkeyPath,
      });
    });
  });
});
