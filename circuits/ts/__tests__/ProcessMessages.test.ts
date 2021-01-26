jest.setTimeout(1200000)
import * as fs from 'fs'
import { 
    genWitness,
    getSignalByName,
} from './utils'

import {
    MaciState,
    STATE_TREE_DEPTH,
} from 'maci-core'

import {
    Keypair,
    Command,
    Message,
    VerifyingKey,
    StateLeaf,
    Ballot,
} from 'maci-domainobjs'

import {
    G1Point,
    G2Point,
    IncrementalQuinTree,
    stringifyBigInts,
} from 'maci-crypto'

const voiceCreditBalance = BigInt(100)

const duration = 30
const maxValues = {
    maxUsers: 25,
    maxMessages: 25,
    maxVoteOptions: 25,
}

const treeDepths = {
    intStateTreeDepth: 2,
    messageTreeDepth: 2,
    messageTreeSubDepth: 1,
    voteOptionTreeDepth: 2,
}

const messageBatchSize = 5

const testProcessVk = new VerifyingKey(
    new G1Point(BigInt(0), BigInt(1)),
    new G2Point([BigInt(0), BigInt(0)], [BigInt(1), BigInt(1)]),
    new G2Point([BigInt(3), BigInt(0)], [BigInt(1), BigInt(1)]),
    new G2Point([BigInt(4), BigInt(0)], [BigInt(1), BigInt(1)]),
    [
        new G1Point(BigInt(5), BigInt(1)),
        new G1Point(BigInt(6), BigInt(1)),
    ],
)

const testTallyVk = new VerifyingKey(
    new G1Point(BigInt(2), BigInt(3)),
    new G2Point([BigInt(3), BigInt(0)], [BigInt(3), BigInt(1)]),
    new G2Point([BigInt(4), BigInt(0)], [BigInt(3), BigInt(1)]),
    new G2Point([BigInt(5), BigInt(0)], [BigInt(4), BigInt(1)]),
    [
        new G1Point(BigInt(6), BigInt(1)),
        new G1Point(BigInt(7), BigInt(1)),
    ],
)

const coordinatorKeypair = new Keypair()
const circuit = 'processMessages_test'

describe('ProcessMessage circuit', () => {
    describe('1 user, 2 messages', () => {
        const maciState = new MaciState()
        const voteWeight = BigInt(9)
        const voteOptionIndex = BigInt(0)
        let stateIndex
        let pollId
        let poll
        const messages: Message[] = []
        const commands: Command[] = []
        let messageTree

        beforeAll(async () => {
            const userKeypair = new Keypair()
            stateIndex = maciState.signUp(userKeypair.pubKey, voiceCreditBalance)

            maciState.stateAq.mergeSubRoots(0)
            maciState.stateAq.merge(STATE_TREE_DEPTH)

            // Sign up and publish
            pollId = maciState.deployPoll(
                duration,
                maxValues,
                treeDepths,
                messageBatchSize,
                coordinatorKeypair,
                testProcessVk,
                testTallyVk,
            )

            poll = maciState.polls[pollId]

            messageTree = new IncrementalQuinTree(
                treeDepths.messageTreeDepth,
                poll.messageAq.zeroValue,
            )

            const command = new Command(
                stateIndex,
                userKeypair.pubKey,
                voteOptionIndex,
                BigInt(0),
                BigInt(2),
                BigInt(pollId),
            )

            const signature = command.sign(userKeypair.privKey)

            const ecdhKeypair = new Keypair()
            const sharedKey = Keypair.genEcdhSharedKey(
                ecdhKeypair.privKey,
                coordinatorKeypair.pubKey,
            )
            const message = command.encrypt(signature, sharedKey)
            messages.push(message)
            commands.push(command)
            messageTree.insert(message.hash())

            poll.publishMessage(message, ecdhKeypair.pubKey)

            // Second command
            const command2 = new Command(
                stateIndex,
                userKeypair.pubKey,
                voteOptionIndex,
                voteWeight,
                BigInt(1),
                BigInt(pollId),
            )
            const signature2 = command2.sign(userKeypair.privKey)

            const ecdhKeypair2 = new Keypair()
            const sharedKey2 = Keypair.genEcdhSharedKey(
                ecdhKeypair2.privKey,
                coordinatorKeypair.pubKey,
            )
            const message2 = command2.encrypt(signature2, sharedKey2)
            messages.push(message2)
            commands.push(command2)
            messageTree.insert(message2.hash())

            poll.publishMessage(message2, ecdhKeypair2.pubKey)

            poll.messageAq.mergeSubRoots(0)
            poll.messageAq.merge(treeDepths.messageTreeDepth)

            expect(messageTree.root.toString())
                .toEqual(
                    poll.messageAq.getRoot(
                        treeDepths.messageTreeDepth,
                    ).toString()
                )
        })

        it('should produce the correct state root and ballot root', async () => {
            const zerothStateLeaf = StateLeaf.genRandomLeaf()

            const zerothBallot = Ballot.genRandomBallot(
                maxValues.maxVoteOptions,
                treeDepths.voteOptionTreeDepth,
            )

            // The current roots
            const currentStateRoot = poll.stateTree.root
            const currentBallotRoot = poll.ballotTree.root

            const generatedInputs = poll.processMessages(
                pollId,
                zerothStateLeaf,
                zerothBallot,
                maciState,
            )

            // Calculate the witness
            const witness = await genWitness(circuit, generatedInputs)
            expect(witness.length > 0).toBeTruthy()

            // The new roots, which should differ
            const newStateRoot = poll.stateTree.root
            const newBallotRoot = poll.ballotTree.root
            expect(newStateRoot.toString()).not.toEqual(currentStateRoot.toString())
            expect(newBallotRoot.toString()).not.toEqual(currentBallotRoot.toString())

            const circuitNewStateRoot = await getSignalByName(circuit, witness, 'main.newStateRoot')
            expect(circuitNewStateRoot.toString()).toEqual(newStateRoot.toString())

            const circuitNewBallotRoot = await getSignalByName(circuit, witness, 'main.newBallotRoot')
            expect(circuitNewBallotRoot.toString()).toEqual(newBallotRoot.toString())

            fs.writeFileSync(
                'witness.json',
                JSON.stringify(witness) 
            )
            const packedVals = MaciState.packProcessMessageSmallVals(
                maxValues.maxVoteOptions,
                maxValues.maxUsers,
                0,
                poll.messageTree.leaves.length - 1,
            )

            // Test the ProcessMessagesInputHasher circuit
            const hasherCircuit = 'processMessagesInputHasher_test'
            const hasherCircuitInputs = stringifyBigInts({
                packedVals,
                coordPubKey: generatedInputs.coordPubKey,

                msgRoot: generatedInputs.msgRoot,
                currentStateRoot: generatedInputs.currentStateRoot,
                currentBallotRoot: generatedInputs.currentBallotRoot,
            })

            const hasherWitness = await genWitness(hasherCircuit, hasherCircuitInputs)
            const hash = await getSignalByName(hasherCircuit, hasherWitness, 'main.hash')
            expect(hash.toString()).toEqual(generatedInputs.inputHash.toString())
        })
    })

    const NUM_BATCHES = 2
    describe(`1 user, ${messageBatchSize * NUM_BATCHES} messages`, () => {
        it('should produce the correct state root and ballot root', async () => {
            const maciState = new MaciState()
            const userKeypair = new Keypair()
            const stateIndex = maciState.signUp(userKeypair.pubKey, voiceCreditBalance)

            maciState.stateAq.mergeSubRoots(0)
            maciState.stateAq.merge(STATE_TREE_DEPTH)
            // Sign up and publish
            const pollId = maciState.deployPoll(
                duration,
                maxValues,
                treeDepths,
                messageBatchSize,
                coordinatorKeypair,
                testProcessVk,
                testTallyVk,
            )

            const poll = maciState.polls[pollId]

            const numMessages = messageBatchSize * NUM_BATCHES
            for (let i = 0; i < numMessages; i ++) {
                const command = new Command(
                    stateIndex,
                    userKeypair.pubKey,
                    BigInt(i),
                    BigInt(1),
                    BigInt(numMessages - i),
                    BigInt(pollId),
                )

                const signature = command.sign(userKeypair.privKey)

                const ecdhKeypair = new Keypair()
                const sharedKey = Keypair.genEcdhSharedKey(
                    ecdhKeypair.privKey,
                    coordinatorKeypair.pubKey,
                )
                const message = command.encrypt(signature, sharedKey)
                poll.publishMessage(message, ecdhKeypair.pubKey)
            }

            poll.messageAq.mergeSubRoots(0)
            poll.messageAq.merge(treeDepths.messageTreeDepth)

            for (let i = 0; i < NUM_BATCHES; i ++) {
                const zerothStateLeaf = StateLeaf.genRandomLeaf()
                const zerothBallot = Ballot.genRandomBallot(
                    maxValues.maxVoteOptions,
                    treeDepths.voteOptionTreeDepth,
                )

                const generatedInputs = poll.processMessages(
                    pollId,
                    zerothStateLeaf,
                    zerothBallot,
                    maciState,
                )

                const newStateRoot = poll.stateTree.root
                const newBallotRoot = poll.ballotTree.root

                const witness = await genWitness(circuit, generatedInputs)
                expect(witness.length > 0).toBeTruthy()

                const circuitNewStateRoot = await getSignalByName(circuit, witness, 'main.newStateRoot')
                expect(circuitNewStateRoot.toString()).toEqual(newStateRoot.toString())
                const circuitNewBallotRoot = await getSignalByName(circuit, witness, 'main.newBallotRoot')
                expect(circuitNewBallotRoot.toString()).toEqual(newBallotRoot.toString())
            }
        })
    })
})