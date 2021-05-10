class IostLockProxy {
  can_update (data) {
    return blockchain.requireAuth(blockchain.contractOwner(), 'active')
  }
}

module.exports = IostLockProxy;