# -*- coding: utf-8 -*-
{
    'name':'A4D Customer Extend',
    'category':'sale',
    'summary':'Sales Modifications',
    'website':'www.emiprotechnologies.com',
    'author':'Emipro Technologies (P) Ltd.',
    'version':'1.0',

    'depends':['sale_expense','sale_payment','base_setup'],
    'data':[
        "view/res_config_settings.xml",
        #"view/view_res_partner.xml",

        "data/res_partner_data.xml",
        "data/subtype_res_partner.xml",
    ],
    'installable':True,
    'auto_install':False,
    'application':False,
    'pre_init_hook':'version_check',
}
