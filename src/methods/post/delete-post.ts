import * as anchor from '@project-serum/anchor'
import { web3 } from '@project-serum/anchor'
import { programId, shadowDriveDomain } from '../../utils/constants'
import { PostChain, UserChain } from '../../models'
import { PostFileData } from '../../types'
import { getPostFileData } from './helpers'
import { getKeypairFromSeed } from '../../utils/helpers'

/**
 * @category Post
 * @param publicKey - the PublicKey of the post
 */
export default async function deletePost(publicKey: web3.PublicKey): Promise<void> {
  try {
    // Fetch the post from the anchor program.
    const post = await this.anchorProgram.account.post.fetch(publicKey)
    const postChain = new PostChain(publicKey, post)

    // Find user id pda.
    const [UserIdPDA] = await web3.PublicKey.findProgramAddress(
      [anchor.utils.bytes.utf8.encode('user_id'), this.wallet.publicKey.toBuffer()],
      programId,
    )

    // Find the user profile pda.
    const [UserProfilePDA] = await web3.PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode('user_profile'),
        anchor.utils.bytes.utf8.encode(postChain.userId.toString()),
      ],
      programId,
    )

    // Fetch the user profile.
    const profile = await this.anchorProgram.account.userProfile.fetch(UserProfilePDA)
    const userChain = new UserChain(profile.publicKey, profile)

    // Check if the user owns the post.
    if (postChain.userId !== userChain.userId)
      throw new Error('The post can be deleted only by the creator.')

    const postFileData: PostFileData = await getPostFileData(publicKey, userChain.shdw)

    // Remove text file.
    if (postFileData.text != null) {
      await this.shadowDrive.deleteFile(
        userChain.shdw.toString(),
        `${shadowDriveDomain}${userChain.shdw.toString()}/${postFileData.text}`,
        'v2',
      )
    }

    // Remove all media files from post from the shadow drive.
    for (const m in postFileData.media) {
      const media = postFileData.media[m]
      await this.shadowDrive.deleteFile(
        userChain.shdw.toString(),
        `${shadowDriveDomain}${userChain.shdw.toString()}/${media.file}`,
        'v2',
      )
    }

    // Delete post json file from the shadow drive.
    await this.shadowDrive.deleteFile(
      userChain.shdw.toString(),
      `${shadowDriveDomain}${userChain.shdw.toString()}/${publicKey.toString()}.json`,
      'v2',
    )

    // Generate the post hash.
    const hash: web3.Keypair = getKeypairFromSeed(
      `${postFileData.timestamp}${postChain.userId.toString()}${postChain.groupId.toString()}`,
    )

    // Find post pda.
    const [PostPDA] = await web3.PublicKey.findProgramAddress(
      [anchor.utils.bytes.utf8.encode('post'), hash.publicKey.toBuffer()],
      programId,
    )

    // Submit the post to the anchor program.
    await this.anchorProgram.methods
      .deletePost(postChain.groupId, hash.publicKey)
      .accounts({
        user: this.wallet.publicKey,
        userId: UserIdPDA,
        post: PostPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    return Promise.resolve()
  } catch (error) {
    return Promise.reject(error)
  }
}
