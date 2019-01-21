import csv
import sys
from odoo import models, fields, api

csv.field_size_limit(sys.maxsize)

import logging

_logger = logging.getLogger(__name__)

STORES = [('click_funnels', 'Click Funnels'),
          ('magento', 'Magento'),
          ('shopify', 'Shopify'),
          ('odoo', 'Odoo'),
          ('other', 'Other')]

class ResPartner(models.Model):
    _inherit = 'res.partner'

    @api.multi
    def _get_default_store(self):
        IrDefault = self.env['ir.default'].sudo()
        return IrDefault.get('res.config.settings', 'customer_default_store')

    store = fields.Selection(STORES, string='Store', default=_get_default_store)
    create_from_script = fields.Boolean(string="Created from Script")

    @api.model
    def _get_tracked_fields(self, updated_fields):
        """
        Use: To log every modification for selected fields will be tracked in the chatter.
        Added by: Gopal Gajera @Emipro Technologies
        :param updated_fields: updated fields of model
        :return: dict of fields
        """
        res = super(ResPartner, self)._get_tracked_fields(updated_fields)
        fields_ids = self.env['ir.default'].sudo().get('res.config.settings', 'partner_field_ids')
        field_name = [x.name for x in self.env['ir.model.fields'].browse(fields_ids)]
        if field_name:
            res1 = self.fields_get(field_name)
            res.update(res1)
        return res

    @api.multi
    def _track_subtype(self, init_values):
        """
        Use: To set different subtype while logging change log.
        Added by: Gopal Gajera @Emipro Technologies
        :param init_values: field with initial values.
        :return: string subtype
        """
        self.ensure_one()
        res = super(ResPartner, self)._track_subtype(init_values)
        if not res:
            return 'a4d_customer_extend.change_logged_action'
        return res

    @api.multi
    def create_portal_user(self):
        """
        Use: Create portal user and send reset password.
        Added by: Arjun Bhoot @Emipro Technologies
        Date: July-09-2018
        :return:Boolean
        """
        self.ensure_one()
        user_email = self and self.email or False
        company_id = self.env.user and self.env.user.company_id and self.env.user.company_id.id or False
        auto_create_portal_user= self.env['ir.default'].sudo().get('res.config.settings', 'auto_create_portal_user',company_id=company_id)
        if user_email :
            user_exist = self.env['res.users'].search([('login','=ilike',user_email)])
            if not user_exist and auto_create_portal_user :
                group_id = self.env.ref('base.group_portal')
                if group_id :
                    vals = {
                        'email':self.email,
                        'partner_id':self.id,
                        'login':self.email,
                        #'groups_id':group_id,
                        #'company_id': self.env.user.company_id and self.env.user.company_id.id or False,#user_id.company_id and user_id.company_id.id or False,
                        }
                    self.env['res.users'].create(vals)
                    self.message_post("Portal User created and password reset invitation sent to : <b>"+self.email+"</b>")
                    _logger.info('method: create_portal_user, message: Invetation sent to {} user.'.format(self.ids))
                else :
                    _logger.info('method: create_portal_user, ERROR_message: Unable to find PORTAL group for user {}'.format(self.ids))
            else :
                _logger.info('method: create_portal_user, message: Invitation already sent to {} user.'.format(self.ids))
        else :
            _logger.info('method: create_portal_user, ERROR_message: {} user has no email address.!'.format(self.ids))
        return True
