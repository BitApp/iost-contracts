
const POLYCHAIN_PUBKEY_LEN = 67;
const POLYCHAIN_SIGNATURE_LEN = 65;

const INIT_STATUS_KEY = "INIT_STATUS";
const CURRENT_EPOCH_HEIGHT_KEY = "currentEpochHeight";
const EPOCH_KEEPERS_PUBKEY_KEY = "keeperPubKeys";

class IostCrossChainManager {
  init () {}

  can_update (data) {
    return blockchain.requireAuth(blockchain.contractOwner(), 'active');
  }

  // can be call for everyone ?
  // rawHeader: byte[]
  // pubkeyList: byte[]
  // can be use hex str, Buffer.form()
  initGenesisBlock(rawHeader, pubKeyList) {
    this._checkKey(INIT_STATUS_KEY, false, "has been init");
    const header = this._deserializerHeader(rawHeader);
    const bookKeeper = this._verifyPubKey(pubKeyList);
    if (header.nextBookKeeper !== bookKeeper.nextBookKeeper) {
      throw "nextBookers illegal"
    }
    this._setCurrentEpochHeight(header.height);
    this._setEpochKeeperPubKeys(bookKeeper.keepers);

    this._put(INIT_STATUS_KEY, 1);
    blockchain.event(JSON.stringify({height: header.height, rawHeader}))
  }

  // rawHeader: byte[]
  // pubkeyList: byte[]
  // sigList: byte[]
  changeBookKeeper(rawHeader, pubKeyList, sigList) {
    const header = this._deserializerHeader(rawHeader);
    const currentHeight = this._getCurrentEpochHeight();
    if (header.height <= currentHeight) {
      throw "The height of header is lower than current epoch start height!"
    }
    if (!header.nextBookKeeper) {
      throw "The nextBookKeeper of header is empty"
    }
    const keepers = this._deserializeKeepers(this._getEpochKeeperPubKeys());
    const n = keepers.length;
    if(!this._verifySig(rawHeader, sigList, keepers, n - (n-1) / 3)){
      throw "Verify signature failed!"
    }
    const bookKeeper = this._verifyPubKey(pubKeyList);
    if(header.nextBookKeeper !== bookKeeper.nextBookKeeper) {
      throw  "NextBookers illegal"
    }
    this._setCurrentEpochHeight(header.height);
    this._setEpochKeeperPubKeys(bookKeeper.keepers);
    blockchain.event(JSON.stringify({height: header.height, rawHeader}))
  }

  crossChain() {

  }

  verifyHeaderAndExecuteTx() {

  }

  _contractOwnerAuth() {
    if (!blockchain.requireAuth(blockchain.contractOwner(), 'active')) {
      throw 'require contractOwner error';
    }
  }

  _checkKey(key, need, err_msg) {
    const exist = storage.has(key);
    if ((need && !exist) || (!need && exist)) {
      throw err_msg;
    }
  }

  // headerBs: byte[]
  _deserializerHeader (headerBs) {
    let offset = 0;
    let ret;
    const header = {};

    ret = this._nextUint32(headerBs, offset);
    header.version = ret[0];
    offset = ret[1];

    ret = this._nextUint64(headerBs, offset);
    header.chainId = ret[0];
    offset = ret[1];

    ret = this._nextHash(headerBs, offset);
    header.prevBlockHash = ret[0];
    offset = ret[1];

    ret = this._nextHash(headerBs, offset);
    header.transactionRoot = ret[0];
    offset = ret[1];

    ret = this._nextHash(headerBs, offset);
    header.crossStatesRoot = ret[0];
    offset = ret[1];

    ret = this._nextHash(headerBs, offset);
    header.blockRoot = ret[0];
    offset = ret[1];

    ret = this._nextUint32(headerBs, offset);
    header.timeStamp = ret[0];
    offset = ret[1];

    ret = this._nextUint32(headerBs, offset);
    header.height = ret[0];
    offset = ret[1];

    ret = this._nextUint64(headerBs, offset);
    header.consensusData = ret[0];
    offset = ret[1];

    ret = this._nextVarBytes(headerBs, offset);
    header.consensusPayload = ret[0];
    offset = ret[1];

    ret = this._nextBytes(headerBs, offset, 20);
    header.nextBookKeeper = ret[0];
    return header;
  }

  _verifyPubKey(pubkeyList) {
    if (pubkeyList.length % POLYCHAIN_PUBKEY_LEN !== 0) {
      throw "pubkeyList illegal";
    }
    const n = pubkeyList.length / POLYCHAIN_PUBKEY_LEN;
    if (n < 1) {
      throw "too short pubkeyList"
    }
    return this._getBookKeeper(n, n - (n -1)/3, pubkeyList)
  }

  // rawHeader: byte[]
  // pubkeyList: byte[]
  // keepers: string[]
  // m: number
  _verifySig(rawHeader, signList, keepers, m) {

  }

  _serializeKeepers(keepers) {
    return JSON.stringify(keepers)
  }

  _deserializeKeepers(data) {
    return JSON.parse(data)
  }

  _setCurrentEpochHeight(height) {
    this._put(CURRENT_EPOCH_HEIGHT_KEY, height)
  }

  _getCurrentEpochHeight() {
    return storage.get(CURRENT_EPOCH_HEIGHT_KEY)
  }

  // keepers: string[]
  _setEpochKeeperPubKeys(keepers) {
    this._put(EPOCH_KEEPERS_PUBKEY_KEY, this._serializeKeepers(keepers))
  }

  _getEpochKeeperPubKeys() {

  }

  _getBookKeeper(keyLen, minSigNum, pubkeyList) {
    let buff = this._writeUint16(Buffer.from([]), keyLen);
    const keepers = new Array(20);
    for (let i = 0; i < keyLen; i++) {
      buff = this._writeVarBytes(buff, this._compressMCPubKey(pubkeyList.slice(i * POLYCHAIN_PUBKEY_LEN, POLYCHAIN_PUBKEY_LEN)));
      keepers[i] = IOSTCrypto.sha3(pubkeyList.slice(i * POLYCHAIN_PUBKEY_LEN, POLYCHAIN_PUBKEY_LEN).slice(3, 64))
    }
    buff = this._writeUint16(buff, m);
    let nextBookKeeper = IOSTCrypto.sha3(buff)
    return {keepers, nextBookKeeper}
  }

  _compressMCPubKey(buff) {
    if (buff.length < 67) {
      throw "key length is too short"
    }
    let newBuff = buff.slice(0, 35);
    if (buff[66] % 2 === 0) {
      newBuff[2] = Buffer.from([0x02])
    } else {
      newBuff[2] = Buffer.from([0x03])
    }
    return newBuff
  }

  _writeVarBytes(source, target) {
    return this._writeVarInt(target.length, source).concat(target)
  }

  _writeVarInt(value, source) {
    if (value < 0) {
      return  source;
    }else if (value < 0xFD) {
      let v = this._padRight(Buffer.from(value), 1);
      return Buffer.concat([source, v]);
    } else if (value <=0xFFFF) {
      let v = this._padRight(Buffer.from(value), 2);
      return Buffer.concat([source, Buffer.from([0xFD]), v]);
    } else if (value <= 0XFFFFFFFF) {
      let v = this._padRight(Buffer.from(value), 4);
      return Buffer.concat([source, Buffer.from([0xFE]), v]);
    } else {
      let v = this._padRight(Buffer.from(value), 8);
      return Buffer.concat([source, Buffer.from([0xFF]), v]);
    }
  }

  _writeUint16(buff, value) {
    return Buffer.concat([buff, this._padRight(Buffer.from(value), 2)])
  }

  _padRight(buff, len) {
    const l = buff.length;
    if (l > len) {
      buff = buff.slice(0, len)
    }
    for (let i = 0; i < length - l; i++) {
      buff = Buffer.concat([buff, Buffer.from([0x00])])
    }
    return buff
  }

  _nextByte(buff, offset) {
    const newOff = offset + 1;
    if (newOff <= buff.length) {
      return [buff.slice(offset, newOff), newOff]
    }
    throw "NextByte, offset exceeds maximum"
  }

  _nextBytes(buff, offset, len) {
    const newOff = offset + len;
    if (newOff <= offset) {
      return [buff.slice(offset, newOff), newOff]
    }
    throw "NextBytes, offset exceeds maximum"
  }

  _nextUint16(buff, offset) {
    const newOff = offset + 2;
    if (newOff <= buff.length) {
      return [buff.slice(offset, newOff).readUInt16BE(), newOff];
    }
    throw "NextUint16, offset exceeds maximum"
  }

  _nextUint32(buff, offset) {
    const newOff = offset + 4;
    if (newOff <= buff.length) {
      return [buff.slice(offset, newOff).readUInt32BE(), newOff];
    }
    throw "NextUint32, offset exceeds maximum"
  }

  _nextUint64(buff, offset) {
    const newOff = offset + 8;
    if (newOff <= buff.length) {
      return [buff.slice(offset, newOff).readBigUInt64BE(), newOff];
    }
    throw "NextUint64, offset exceeds maximum"
  }

  _nextHash(buff, offset) {
    const newOff = offset + 32;
    if (newOff <= buff.length) {
      return [buff.slice(offset, newOff), newOff]
    }
    throw "NextHash, offset exceeds maximum"
  }

  _nextVarBytes(buff, offset) {
    let ret = this._nextVarUint(buff, offset);
    let count = ret[0];
    offset = ret[1];
    return this._nextBytes(buff, offset, count)
  }

  _nextVarUint(buff, offset) {
    let v;
    let ret;
    ret = this._nextByte(buff, offset);
    v = ret[0];
    offset = ret[1];

    let value;
    if (v === 0xFD) {
      ret = this._nextUint16(buff, offset);
      value = ret[0];
      offset = ret[1];
      if (value < 0xFD || value > 0xFFFF) {
        throw "NextUint16, value outside range";
      }
      return [value, offset];
    } else if ( v === 0xFE) {
      ret = this._nextUint32(buff, offset);
      value = ret[0];
      offset = ret[1];
      if (value <= 0xFFFF || value > 0xFFFFFFFF) {
        throw "NextVarUint, value outside range"
      }
      return [value, offset];
    } else if ( v === 0xFF) {
      ret = this._nextUint64(buff, offset);
      value = ret[0];
      offset = ret[1];
      if (value < 0xFFFFFFFF) {
        throw "NextVarUint, value outside range"
      }
      return [value, offset];
    } else {
      value = 0x00;
      if (value >= 0xFD) {
        throw "NextVarUint, value outside range"
      }
      return [value, offset];
    }
  }

  // key,value string
  _put(key, value){
    storage.put(key, value, tx.publisher)
  }
}

module.exports = IostCrossChainManager;