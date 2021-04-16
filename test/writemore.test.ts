const { accounts, contract } = require('@openzeppelin/test-environment');
const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
    time
  } = require('@openzeppelin/test-helpers');
const [ owner, user1] = accounts;
const { expect } = require('chai');



const WriteMore = contract.fromArtifact('WriteMore'); // Loads a compiled contract



describe('Write More', async function () {  


    beforeEach(async function () {
        const todaysTime = Date.now();
        const currentTime = (await time.latest()).toNumber()
        if(currentTime < todaysTime){
            // console.log(`updating time from ${currentTime} to ${todaysTime}`)
            await time.increaseTo(todaysTime)
            this.updatedTime = (await time.latest()).toNumber()
        }
        this.myContract = await WriteMore.new({ from: owner });
      });


    // before(async function () {


    // })

    // async function resetTime (){
       
    // }


    it('Deployer can call balance', async function () {
        try{

            const bn = new BN(await this.myContract.getBalance({from: owner})).toString()
            expect(bn).to.equal("0");

        } catch(err) {
            console.log(err)
        }
 
    });

    it("Add a user's Commitment- Success", async function (){
        const submitUser = await this.myContract.initialCommit(this.updatedTime + 87400, {from: user1, value: "20000000000000000"})
        expectEvent(submitUser, "committed", { _from: user1})        
    })

    it("Add a user's commitment - No gas revert", async function () {
        await expectRevert(this.myContract.initialCommit(this.updatedTime + 87400 , {from: user1}), "Sent too much or too little at stake")
    })

    it("Add a user's commitment - Didnt select enough days", async function () {
        await expectRevert(this.myContract.initialCommit(this.updatedTime, {from: user1,  value: "20000000000000000"}), "Didnt select enough days")
    })


    it("Add a user's commitment - Already has a commitment", async function () {
        await this.myContract.initialCommit(this.updatedTime + 87400, {from: user1, value: "20000000000000000"}), 
        await expectRevert(this.myContract.initialCommit(this.updatedTime + 87400, {from: user1}) ,"Already has a commitment")
    })

    it("Update a commitment - Can only update commitment at a time that occurs after latestSubmitDate", async function () {
        await this.myContract.initialCommit(this.updatedTime + 604800, {from: user1, value: "20000000000000000"})
        await expectRevert(this.myContract.updateCommitment({from: user1}), "Can only update commitment at a time that occurs after latestSubmitDate")
        // const test2 = (await time.latest()).words[0]
        // const teste =  await this.myContract.returnCommitmentDetails({from: user1})
        // //latest submit date worked
        // expect(teste.receipt.logs[0].args.latestSubmitDate.words[0]).to.equal(test2)
        // //no days have been missed
        // expect(teste.receipt.logs[0].args.daysMissed.words[0]).to.equal(0)

    })


    it("Update a commitment- success- No missed days", async function (){
        await this.myContract.initialCommit(this.updatedTime + 604800, {from: user1, value: "20000000000000000"})
        await time.increase(30000)
        const time2 = (await time.latest()).words[0]
        await this.myContract.updateCommitment({from: user1})
        const teste =  await this.myContract.returnCommitmentDetails({from: user1})
        //latest submit date worked
        expect(teste.receipt.logs[0].args.latestSubmitDate.words[0]).to.equal(time2)
        //no days have been missed
        expect(teste.receipt.logs[0].args.daysMissed.words[0]).to.equal(0)
    })

    it("Update a commitment - success - Last Days ", async function () {

        await this.myContract.initialCommit(this.updatedTime + 172800, {from: user1, value: "20000000000000000"})
        await time.increase(86400)
        const lastDay = await this.myContract.updateCommitment({from: user1});
 
    })

    it("Update a commitment - success - 1 Missed Days ", async function () {
        await this.myContract.initialCommit(this.updatedTime + 604800, {from: user1, value: "20000000000000000"})

        // Increase beyond a day but no more
        await time.increase(96401)
        const test2 = (await time.latest()).words[0]
        await this.myContract.updateCommitment({from: user1})
        const teste =  await this.myContract.returnCommitmentDetails({from: user1})
        //latest submit date worked
        expect(teste.receipt.logs[0].args.latestSubmitDate.words[0]).to.equal(test2)
        //no days have been missed
        expect(teste.receipt.logs[0].args.daysMissed.words[0]).to.equal(1)

    })


    it("Update a commitment - error - 6hour buffer ", async function () {
        await this.myContract.initialCommit(this.updatedTime + 604800, {from: user1, value: "20000000000000000"})
        await time.increase(1000)
        await expectRevert(this.myContract.updateCommitment({from: user1}), "6 Hour buffer between next submission")
    })

    it("Update a commitment - error - Bad Address ", async function () {
        await expectRevert(this.myContract.updateCommitment({from: user1}), "No commitment for address")
    })

  });

