// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Provenance721
/// @notice ERC‑721 token that anchors a content hash on chain and allows
///         both owner‑gated minting and EIP‑712 signed minting by authors.
///         Each contentHash can only be minted once, enforcing uniqueness.
contract Provenance721 is ERC721, Ownable, EIP712 {
    struct Record {
        bytes32 contentHash;
        string metadataURI;
        bool revoked;
    }

    // Mapping from content hash to tokenId to enforce uniqueness
    mapping(bytes32 => uint256) public tokenIdByHash;
    // Mapping from tokenId to record data
    mapping(uint256 => Record) public records;
    // Next token identifier to mint
    uint256 public nextId = 1;

    // Nonces used for EIP‑712 mint requests per author address
    mapping(address => uint256) public nonces;

    /// @dev Typehash for the MintRequest struct used in EIP‑712
    bytes32 private constant MINTREQUEST_TYPEHASH = keccak256(
        "MintRequest(bytes32 contentHash,string metadataURI,address to,address author,uint256 nonce,uint256 deadline)"
    );

    /// @notice Emitted when a new token is minted
    event Minted(uint256 indexed tokenId, bytes32 indexed contentHash, string metadataURI);
    /// @notice Emitted when a token's revoked flag is toggled
    event Revoked(uint256 indexed tokenId);

    /// @param name Name for ERC‑721 token
    /// @param symbol Symbol for ERC‑721 token
    constructor() ERC721("Provenance721", "PRV") EIP712("Provenance721", "1") {}

    /// @notice Owner‑gated mint. Mints a token for a unique content hash.
    /// @param contentHash Bytes32 digest of the content
    /// @param metadataURI URI pointing to off‑chain metadata (IPFS/Arweave/HTTP)
    /// @param to Address to receive the minted token
    function mint(bytes32 contentHash, string calldata metadataURI, address to) external onlyOwner returns (uint256) {
        require(contentHash != bytes32(0), "bad hash");
        require(tokenIdByHash[contentHash] == 0, "duplicate content");
        uint256 tid = nextId++;
        _safeMint(to, tid);
        records[tid] = Record({contentHash: contentHash, metadataURI: metadataURI, revoked: false});
        tokenIdByHash[contentHash] = tid;
        emit Minted(tid, contentHash, metadataURI);
        return tid;
    }

    /// @notice Mint request used for EIP‑712 signed minting
    struct MintRequest {
        bytes32 contentHash;
        string metadataURI;
        address to;
        address author;
        uint256 nonce;
        uint256 deadline;
    }

    /// @dev Compute the hash of a MintRequest for EIP‑712
    function _hash(MintRequest calldata req) internal view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    MINTREQUEST_TYPEHASH,
                    req.contentHash,
                    keccak256(bytes(req.metadataURI)),
                    req.to,
                    req.author,
                    req.nonce,
                    req.deadline
                )
            )
        );
    }

    /// @notice Mint a token with an author‑signed request. Anyone can submit the request as long as the signature is valid.
    /// @param req The mint request
    /// @param signature Author's signature over the typed data
    function mintWithSig(MintRequest calldata req, bytes calldata signature) external returns (uint256) {
        require(req.deadline >= block.timestamp, "deadline expired");
        // Verify and increment nonce for the author
        require(req.nonce == nonces[req.author]++, "invalid nonce");
        bytes32 digest = _hash(req);
        address signer = ECDSA.recover(digest, signature);
        require(signer == req.author, "invalid signature");
        require(tokenIdByHash[req.contentHash] == 0, "duplicate content");
        uint256 tid = nextId++;
        _safeMint(req.to, tid);
        records[tid] = Record({contentHash: req.contentHash, metadataURI: req.metadataURI, revoked: false});
        tokenIdByHash[req.contentHash] = tid;
        emit Minted(tid, req.contentHash, req.metadataURI);
        return tid;
    }

    /// @notice Toggle the revoked flag on a token (owner only)
    /// @param tokenId Token identifier
    /// @param r Boolean to set revoked status
    function setRevoked(uint256 tokenId, bool r) external onlyOwner {
        require(_exists(tokenId), "no token");
        records[tokenId].revoked = r;
        emit Revoked(tokenId);
    }

    /// @notice Return the record associated with a tokenId
    function getRecord(uint256 tokenId) external view returns (Record memory) {
        return records[tokenId];
    }
}