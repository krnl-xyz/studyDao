import { ethers } from "krnl-sdk";

export class KRNLService {
  constructor() {
    this.entryId = process.env.NEXT_PUBLIC_ENTRY_ID;
    this.accessToken = process.env.NEXT_PUBLIC_ACCESS_TOKEN;
    this.contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    this.provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_KRNL);
    this.abiCoder = new ethers.AbiCoder();
  }

  async executeKernel(senderAddress, functionName, functionParams) {
    try {
      // Encode parameters for kernel 1593
      const kernelParams = this.encodeKernelParams(functionName, functionParams);
      
      const kernelRequestData = {
        senderAddress: senderAddress,
        kernelPayload: {
          "1593": {
            functionParams: kernelParams
          }
        }
      };

      // Encode function parameters for smart contract
      const encodedFunctionParams = this.encodeFunctionParams(functionName, functionParams);

      const result = await this.provider.executeKernels(
        this.entryId,
        this.accessToken,
        kernelRequestData,
        encodedFunctionParams
      );

      return result;
    } catch (error) {
      console.error("KRNL execution error:", error);
      throw new Error(`KRNL execution failed: ${error.message}`);
    }
  }

  encodeKernelParams(functionName, params) {
    switch (functionName) {
      case 'verifyStudySessionWithKRNL':
        // Encode [address member, uint256 sessionIndex]
        return this.abiCoder.encode(
          ["address", "uint256"],
          [params.member, params.sessionIndex]
        );
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  encodeFunctionParams(functionName, params) {
    switch (functionName) {
      case 'verifyStudySessionWithKRNL':
        return this.abiCoder.encode(
          ["address", "uint256"],
          [params.member, params.sessionIndex]
        );
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }
}