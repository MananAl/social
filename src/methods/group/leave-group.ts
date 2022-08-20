import * as anchor from '@project-serum/anchor'
import { web3 } from '@project-serum/anchor'
import { programId } from '../../utils/constants'

/**
 * @category Group
 * @param groupId - the id of the group
 */
export default async function leaveGroup(groupId: string): Promise<void> {
  try {
    // Find the user id pda.
    const [UserIdPDA] = await web3.PublicKey.findProgramAddress(
      [anchor.utils.bytes.utf8.encode('user_id'), this.wallet.publicKey.toBuffer()],
      programId,
    )

    // Fetch the user id.
    const fetchedUserId = await this.anchorProgram.account.userId.fetch(UserIdPDA)

    // Find the user profile pda.
    const [UserProfilePDA] = await web3.PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode('user_profile'),
        anchor.utils.bytes.utf8.encode(fetchedUserId.uid.toString()),
      ],
      programId,
    )

    // Send user join group to the anchor program.
    await this.anchorProgram.methods
      .leaveGroup(Number(groupId))
      .accounts({
        user: this.wallet.publicKey,
        userId: UserIdPDA,
        userProfile: UserProfilePDA,
      })
      .rpc()

    return Promise.resolve()
  } catch (error) {
    return Promise.reject(error)
  }
}
