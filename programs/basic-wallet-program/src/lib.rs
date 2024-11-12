use anchor_lang::prelude::*;

declare_id!("BAkuLHgAtGJDtNmw65ZaoJsLuQnggkwtDaQ7USiEDjgw");

#[program]
pub mod basic_wallet_program {
    use super::*;

    pub fn validate_account(ctx: Context<TransferSol>,  passkey: [u8; 32]) -> Result<()> {
        let (expected_pda, bump_seed) = Pubkey::find_program_address(&[b"pda", passkey.as_ref()], &ctx.program_id);

        msg!("bump: {:?}", bump_seed);
        msg!("expected_pda: {:?}", expected_pda);

        // let x = Pubkey::create_program_address(&[b"vault", &[bump_seed]], &ctx.program_id)?;
        Ok(())
    }

    pub fn initialize(ctx: Context<Initialize>, passkey: [u8; 32]) -> Result<()> {
        let wallet_account = &mut ctx.accounts.pda_account;
        wallet_account.user = passkey;
        wallet_account.bump = ctx.bumps.pda_account;
        msg!("passKey: {:?}", wallet_account.user);
        msg!("bump: {:?}", wallet_account.bump);

        Ok(())
    }

    pub fn transfer_sol(ctx: Context<TransferSol>, amount: u64) -> Result<()> {
        let from = ctx.accounts.pda_account.to_account_info();
        let to = ctx.accounts.recipient.to_account_info();

        if **from.try_borrow_lamports()? < amount {
            return  err!(CustomError::InsufficientFundsForTransaction);
        }

        **from.try_borrow_mut_lamports()? -= amount;
        **to.try_borrow_mut_lamports()? += amount;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(passkey: [u8; 32])]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [b"pda", passkey.as_ref()],
        bump,
        payer = sponsor,
        space = 8 + WalletAccount::INIT_SPACE
    )]
    pub pda_account: Account<'info, WalletAccount>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub sponsor: Signer<'info>,
}


#[derive(Accounts)]
pub struct TransferSol<'info> {
    /// CHECK: Use owner constraint to check account is owned by our program
    #[account(
        mut,
        seeds = [b"pda", pda_account.user.as_ref()], 
        bump = pda_account.bump,
        // owner = id()
    )]
    pub pda_account: Account<'info, WalletAccount>,
    pub sponsor: Signer<'info>,
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct WalletAccount {
    pub user: [u8; 32],
    bump: u8,
}

#[error_code]
pub enum CustomError {
    #[msg("MyAccount may only hold data below 100")]
    InsufficientFundsForTransaction
}
