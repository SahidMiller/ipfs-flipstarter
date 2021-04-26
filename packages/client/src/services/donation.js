import EventEmitter from 'events'

export default class DonationService extends EventEmitter {
    constructor({ name, comment, satoshis }) {
        //TODO God willing: set satoshis to minimum
        this.donation = { name = "", comment = "", satoshis = 0 }
    }

    getDonation() {
        return this.donation
    }

    updateName(name) {
        this.donation.name = name
        this.emit("update", this.donation)
    }

    updateComment(comment) {
        this.donation.comment = comment
        this.emit("update", this.donation)
    }

    updateAmount(satoshis) {
        if (this.locked) return
        this.donation.satoshis = satoshis
        this.emit("update", this.donation)
    }

    commit(err, commitment) {
        if (err) {
            this.emit("commitment-failed", err)
        } else {
            this.emit("commitment-success", commitment)
        }

        this.locked = false
    }

    ready() {
        this.emit("commitment-pending")
        this.locked = true
    }
}