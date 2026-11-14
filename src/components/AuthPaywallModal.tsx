// Lớp tương thích: giao diện mua vé cũ nay dùng CheckoutModal mới.
// Nên dùng useEntitlement().openCheckout() thay cho component này.
import React from 'react';
import type { LanguageCode, Ticket } from '../types';
import { CheckoutModal } from './checkout/CheckoutModal';
import { storeTicket } from './checkout/ticketStorage';
import { useOptionalEntitlement } from '../context/EntitlementContext';

interface AuthPaywallModalProps {
  isOpen: boolean;
  lang: LanguageCode;
  onClose: () => void;
  /** Called with the redeemed code after a successful activation (legacy). */
  onActivateClaimCode?: (code: string) => void;
  /** Called after a successful payment (legacy). */
  onActivatePayoo?: () => void;
  siteId?: number | null;
}

export const AuthPaywallModal: React.FC<AuthPaywallModalProps> = ({
  isOpen,
  lang,
  onClose,
  onActivateClaimCode,
  onActivatePayoo,
  siteId = null
}) => {
  const ent = useOptionalEntitlement();
  const handleSuccess = (ticket: Ticket) => {
    if (ent) ent.applyTicket(ticket);
    else storeTicket(ticket);
    if (ticket.code && onActivateClaimCode) onActivateClaimCode(ticket.code);
    else if (onActivatePayoo) onActivatePayoo();
  };
  return (
    <CheckoutModal
      isOpen={isOpen}
      onClose={onClose}
      lang={lang}
      siteId={siteId}
      currentTicket={ent ? ent.ticket : null}
      onSuccess={handleSuccess}
    />
  );
};

export default AuthPaywallModal;
