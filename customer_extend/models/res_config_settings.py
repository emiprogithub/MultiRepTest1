from odoo import models, fields, api

class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    customer_default_store = fields.Selection(
            [('click_funnels', 'ClickFunnels'), ('magento', 'Magento'), ('shopify', 'Shopify'),
             ('odoo', 'Odoo'), ('other', 'Other')],
            string='Customer Default Store',
            help="This will set in customer's default store.")

    partner_field_ids = fields.Many2many('ir.model.fields',
                                         string='Fields for Change Log',
                                         help='Every modification to selected fields will be tracked in the chatter.')
    auto_create_portal_user = fields.Boolean(string='Auto Create Portal User')

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        IrDefault = self.env['ir.default'].sudo()
        company_id = self.company_id.id or self.env.user.company_id.id
        customer_default_store = IrDefault.get('res.config.settings', "customer_default_store")
        partner_field_ids = IrDefault.get('res.config.settings', "partner_field_ids")
        auto_create_portal_user = IrDefault.get('res.config.settings', "auto_create_portal_user", company_id=company_id)

        res.update(customer_default_store=customer_default_store or '',
                   partner_field_ids=partner_field_ids or False,
                   auto_create_portal_user=auto_create_portal_user or False)
        return res

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        company_id = self.company_id.id
        IrDefault = self.env['ir.default'].sudo()
        IrDefault.set('res.config.settings', "customer_default_store", self.customer_default_store)
        IrDefault.set('res.config.settings', "partner_field_ids", self.partner_field_ids.ids)
        IrDefault.set('res.config.settings', "auto_create_portal_user", self.auto_create_portal_user or False, company_id=company_id)